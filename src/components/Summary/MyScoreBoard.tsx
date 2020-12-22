// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { observer } from "mobx-react";
import * as React from "react";
import getStore, { MyGameScore } from "../../store/SummaryStore";
import { Localizer } from "../../utils/Localizer";
import "./summary.scss";

/**
 * <MyScoreBoard> component for score board on summary page
 * @observer decorator on the component this is what tells MobX to rerender the component whenever the data it relies on changes.
 */
@observer
export class MyScoreBoard extends React.PureComponent<any, any> {
    private scores: MyGameScore[];
    constructor(props) {
        super(props);
        this.scores = getStore().scoreBoard;
        this.state = {
            visible: 3
        };
        this.showMore = this.showMore.bind(this);
    }

    render() {
        return (
            // preparing score board
            this.scores && this.scores.length > 0 ?
                <>
                    <div className="timeline">
                        {
                            this.scores.slice(0, this.state.visible).map((score, index) => (
                                this.renderTimelineElement(score.score, score.timeStamp, index)
                            ))
                        }
                    </div>
                    {
                        this.scores.length > 3 && this.scores.length > this.state.visible ?
                        <span className="link my-score-link" onClick={this.showMore}>+ {Localizer.getString("LoadMore")}</span>
                        :
                        <div></div>
                    }
                </>
                :
                <div className="content">
                    <label>
                    {this.props.youHaveNotResponded}
                </label>
                </div>
        );
    }

    /**
    * Helper method to render the score board row
    * @param score score
    * @param timeStamp timeStamp
    * @param index index
    */
    renderTimelineElement(score: string, timeStamp: string, index: number): JSX.Element {
        return (
            <div className="container right">
                <div className="content" key={index}>
                    <strong>{score}</strong>
                    <span className="pull-right">{timeStamp}</span>
                </div>
            </div>
        );
    }

    // helper method to increase the row visibility count
    private showMore() {
        this.setState((prev) => {
            return { visible: prev.visible + 3 };
        });
    }
}
