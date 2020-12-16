// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as React from "react";
import { observer } from "mobx-react";
import getStore from "./../../store/SummaryStore";
import "./summary.scss";
import { Localizer } from "../../utils/Localizer";
import { ErrorView } from "../ErrorView";
import { ProgressState } from "./../../utils/SharedEnum";
import { ActionSdkHelper } from "../../helper/ActionSdkHelper";
import { MyScoreBoard } from "./MyScoreBoard";
import { BanIcon, Button, CalendarIcon, Card, Flex, MoreIcon, Text, TrashCanIcon } from "@fluentui/react-northstar";
import { LeaderBoardView } from "./LeaderBoard";
import { UxUtils } from "../../utils/UxUtils";
import { AdaptiveMenu, AdaptiveMenuItem, AdaptiveMenuRenderStyle } from "../Menu";
import {
    closeGame,
    deleteGame,
    gameCloseAlertOpen,
    gameDeleteAlertOpen,
    gameExpiryChangeAlertOpen,
    setDueDate,
    setProgressStatus,
    updateDueDate
} from "../../actions/SummaryActions";
import * as actionSDK from "@microsoft/m365-action-sdk";
import { DateTimePickerView } from "../DateTime";

/**
 * <SummaryPage> component to render data for summary page
 * @observer decorator on the component this is what tells MobX to rerender the component whenever the data it relies on changes.
 */
@observer
export default class SummaryPage extends React.Component<any, any> {
    private bodyContainer: React.RefObject<HTMLDivElement>;
    constructor(props) {
        super(props);
        this.bodyContainer = React.createRef();
    }
    render() {
        let progressStatus = getStore().progressStatus;
        if (progressStatus.actionInstance == ProgressState.InProgress ||
            progressStatus.currentContext == ProgressState.InProgress ||
            progressStatus.localizationInstance == ProgressState.InProgress ||
            progressStatus.myScoreDataInstance == ProgressState.InProgress ||
            progressStatus.leaderboardDataAInstance == ProgressState.InProgress ||
            progressStatus.settingInstance == ProgressState.InProgress) {
            return <div />;
        } else if (progressStatus.actionInstance == ProgressState.Failed || progressStatus.currentContext == ProgressState.Failed ||
            progressStatus.localizationInstance == ProgressState.Failed || progressStatus.myScoreDataInstance == ProgressState.Failed ||
            progressStatus.leaderboardDataAInstance == ProgressState.Failed || progressStatus.settingInstance == ProgressState.Failed) {
            ActionSdkHelper.hideLoadingIndicator();
            return (
                <ErrorView
                    title={Localizer.getString("GenericError")}
                    buttonTitle={Localizer.getString("Close")}
                />
            );
        } else {
            ActionSdkHelper.hideLoadingIndicator();
            return this.getsSummaryView();
        }
    }
    /**
     * Method to return the view based on the user selection
     */
    private getsSummaryView(): JSX.Element {
        return (
            <Flex
                column
                className="body-container no-mobile-footer no-top-padding summaryview"
                ref={this.bodyContainer}
                id="bodyContainer"
                tabIndex={0}
            >
                {this.setUpGameCloseCard()}
                {this.setUpGameDeleteCard()}
                {this.setUpChangeDueDateCard()}
                {this.getTitleContainer()}
                {this.getMyScores()}
                {this.getLeaderBoard()}
            </Flex>
        )
    };

    // Get title section of summary view
    private getTitleContainer(): JSX.Element {
        return (
            <Flex className="summary-header title-container-background-color"
                role="group"
                aria-label="Leaderboard"
                column gap="gap.smaller" >
                <Card aria-roledescription="card avatar" fluid
                    className="card-container-background-color">
                    <Flex style={{ justifyContent: "flex-end" }}>
                        {this.getMenu()}
                    </Flex>
                    <Card.Header fitted>
                        <Text content={this.getGameTitle()} weight="bold" style={{ marginTop: "-24px", paddingRight: "32px" }} />
                        {this.gameDueDateString()}
                    </Card.Header>
                </Card>
            </Flex>
        );
    }

    // Get my scores section of summary view
    private getMyScores(): JSX.Element {
        return (
            <>
                <label
                    className="settings-item-title myscore-board-padding">
                    {Localizer.getString("YourScoreInSummaryView")}
                </label>
                <MyScoreBoard
                    youHaveNotResponded={Localizer.getString("YouHaveNotResponded")} />
            </>
        );
    }

    // get leaderboard section of summary view
    private getLeaderBoard(): JSX.Element {
        return (
            getStore().isLeaderBoardVisible ?
                <Flex className="settings-item-margin"
                    role="group"
                    aria-label="Leaderboard"
                    column gap="gap.smaller">
                    <label className="settings-item-title leader-board-padding">
                        {Localizer.getString("LeaderboardInSummaryView")}
                    </label>
                    <LeaderBoardView noOneHasResponded={Localizer.getString("NoOneHasResponded")} />
                </Flex> : <div></div>
        );
    }

    // get game title
    private getGameTitle() {
        const title = getStore().title;
        if (title) {
            return title;
        } else {
            return Localizer.getString("GameDefaultString");
        }
    }

    // fetch due date string
    private gameDueDateString(): JSX.Element {
        const date = new Date(getStore().dueDate);
        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        };
        const local = getStore().local;
        if (!getStore().isGameExpired) {
            return (
                <Text content={Localizer.getString("GameActiveString") + UxUtils.formatDate(date, local, options)} size="medium" />
            );
        } else {
            return (
                <Text content={Localizer.getString("GameExpired")} size="medium" className="expired-game-text-color" />
            );
        }
    }


    private getMenu() {
        let menuItems: AdaptiveMenuItem[] = this.getMenuItems();
        if (menuItems.length == 0) {
            return null;
        }
        return (
            <AdaptiveMenu
                className="triple-dot-menu"
                key="survey_options"
                renderAs={UxUtils.renderingForMobile() ? AdaptiveMenuRenderStyle.ACTIONSHEET : AdaptiveMenuRenderStyle.MENU}
                content={<MoreIcon title={Localizer.getString("MoreOptions")} outline aria-hidden={false} role="button" />}
                menuItems={menuItems}
                dismissMenuAriaLabel={Localizer.getString("DismissMenu")}
            />
        );
    }

    private isCurrentUserCreator(): boolean {
        return getStore().actionInstance && getStore().context.userId == getStore().actionInstance.creatorId;
    }

    private isGameActive(): boolean {
        return getStore().actionInstance && getStore().actionInstance.status == actionSDK.ActionStatus.Active;
    }

    getMenuItems(): AdaptiveMenuItem[] {
        let menuItemList: AdaptiveMenuItem[] = [];
        if (this.isCurrentUserCreator() && this.isGameActive()) {
            let changeExpiry: AdaptiveMenuItem = {
                key: "changeDueDate",
                content: Localizer.getString("ChangeDueDate"),
                icon: <CalendarIcon outline={true} />,
                onClick: () => {
                    if (getStore().progressStatus.updateActionInstance != ProgressState.InProgress) {
                        setProgressStatus({ updateActionInstance: ProgressState.NotStarted });
                    }
                    gameExpiryChangeAlertOpen(true);
                    gameDeleteAlertOpen(false);
                    gameCloseAlertOpen(false);
                }
            };

            menuItemList.push(changeExpiry);

            let closeGame: AdaptiveMenuItem = {
                key: "close",
                content: Localizer.getString("CloseGame"),
                icon: <BanIcon outline={true} />,
                onClick: () => {
                    if (getStore().progressStatus.closeActionInstance != ProgressState.InProgress) {
                        setProgressStatus({ closeActionInstance: ProgressState.NotStarted });
                    }
                    gameCloseAlertOpen(true);
                    gameExpiryChangeAlertOpen(false);
                    gameDeleteAlertOpen(false);
                }
            };
            menuItemList.push(closeGame);
        }

        if (this.isCurrentUserCreator()) {
            let deleteGame: AdaptiveMenuItem = {
                key: "delete",
                content: Localizer.getString("DeleteGame"),
                icon: <TrashCanIcon outline={true} />,
                onClick: () => {
                    if (getStore().progressStatus.deleteActionInstance != ProgressState.InProgress) {
                        setProgressStatus({ deleteActionInstance: ProgressState.NotStarted });
                    }
                    gameDeleteAlertOpen(true);
                    gameExpiryChangeAlertOpen(false);
                    gameCloseAlertOpen(false);
                }
            };
            menuItemList.push(deleteGame);
        }
        return menuItemList;
    }

    private setUpGameCloseCard() {
        if (getStore().isGameCloseBoxOpen) {
            return (
                <Flex
                    role="group"
                    aria-label="setUpGameCloseCard"
                    column gap="gap.smaller" >
                    <Card aria-roledescription="CloseTournament" fluid
                        className="card-container-background-color card-padding">
                        <Card.Header fitted >
                            <Flex column gap="gap.small" >
                                <Text content="Close tournament" weight="bold" />
                                <Text content="Are you sure you want to close this tournament?" error />
                                <Flex gap="gap.small" styles={{ justifyContent: "flex-end" }}>
                                    <Button content="Cancel" secondary
                                        onClick={
                                            () => {
                                                gameCloseAlertOpen(false);
                                            }
                                        } />
                                    <Button content="Confirm" primary
                                        onClick={() => {
                                            closeGame();
                                        }} />
                                </Flex>
                            </Flex>
                        </Card.Header>
                    </Card>
                </Flex>
            );
        }
    }

    private setUpGameDeleteCard() {
        if (getStore().isDeleteSurveyBoxOpen) {
            return (
                <Flex
                    role="group"
                    aria-label="setUpGameDeleteCard"
                    column gap="gap.smaller" >
                    <Card aria-roledescription="CloseTournament" fluid
                        className="card-container-background-color card-padding">
                        <Card.Header fitted >
                            <Flex column gap="gap.small" >
                                <Text content="Delete tournament" weight="bold" />
                                <Text content="Are you sure you want to delete this tournament?" error />
                                <Flex gap="gap.small" styles={{ justifyContent: "flex-end" }}>
                                    <Button content="Cancel" secondary
                                        onClick={
                                            () => {
                                                gameDeleteAlertOpen(false);
                                            }
                                        } />
                                    <Button content="Confirm" primary
                                        onClick={() => {
                                            deleteGame();
                                        }} />
                                </Flex>
                            </Flex>
                        </Card.Header>
                    </Card>
                </Flex>
            );
        }
    }

    private setUpChangeDueDateCard() {
        if (getStore().isChangeExpiryBoxOpen) {
            return (
                <Flex
                    role="group"
                    aria-label="setUpChangeDueDateCard"
                    column gap="gap.smaller" >
                    <Card aria-roledescription="ChangeDueDateOfTournament"
                        fluid
                        className="card-container-background-color card-padding" >
                        <Card.Header fitted >
                            <Flex column gap="gap.smaller" >
                                <Text content="Change due date" weight="bold" />
                                <Flex gap="gap.smaller">
                                    <DateTimePickerView showTimePicker locale={getStore().context.locale} renderForMobile={UxUtils.renderingForMobile()} minDate={new Date()} value={new Date(getStore().dueDate)} placeholderDate={Localizer.getString("SelectADate")} placeholderTime={Localizer.getString("SelectATime")} onSelect={(date: Date) => {
                                        setDueDate(date.getTime());
                                    }} />
                                    {getStore().progressStatus.updateActionInstance == ProgressState.Failed ? <Text content={Localizer.getString("SomethingWentWrong")} error /> : null}
                                </Flex>
                                <Flex gap="gap.smaller" styles={{ justifyContent: "flex-end" }}>
                                    <Button content="Cancel" secondary
                                        onClick={
                                            () => {
                                                gameExpiryChangeAlertOpen(false);
                                            }
                                        } />
                                    <Button content="Change" primary
                                        onClick={() => {
                                            updateDueDate(getStore().dueDate);
                                        }} />
                                </Flex>
                            </Flex>
                        </Card.Header>
                    </Card>
                </Flex>
            );
        }
    }
}
