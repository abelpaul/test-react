import React, { Component } from "react";
import NumPad from 'react-numpad';

var box_dict = {0 : 'Blue',
               1:'Orange',
               2: 'Tan',
               3:'Yellow',
               4:'Green',
               5:'Pink',
               6:'Purple',
               7:'Gray',
               8:'Fries',
               9:'Shake'};
export class DisplayStat extends React.Component {
    state = {
        num_box : this.props.num_box
    }

    deleteRow = (props) => {
        let changed = this.state.num_box;
        console.log(props);
        this.setState({
            num_box : changed
        });
        this.sendData();
    }
    sendData = () => {
         this.props.parentCallback(this.state.num_box);
    }
    render() {
        const box_list = this.state.num_box.map( (b, i) =>{
                return this.state.num_box[i] > 0 && <div style={{width:'inherit', height:'auto'}}>
                    <NumPad.Number className="box-entry"
                            key = {i}
                            onChange={(value) => {
                                let changed = this.state.num_box;
                                changed[i] = parseInt(value);
                                this.setState({
                                    num_box : changed
                                });
                                this.sendData();
                             }}
                            position={"startBottomLeft"}
                            value={this.state.num_box[i]}
                            decimal={1}
                            negative={false}
                            >
                                <div className="box-entry">
                                    {this.props.box_dict[i] +":       "+ this.state.num_box[i]}

                                </div>

                            </NumPad.Number>
                            <button
                            style={{position:'absolute', right:'0px', }}
                            onClick = {() => {
                                let changed = this.state.num_box;
                                changed[i] = 0;
                                this.setState({
                                    num_box : changed
                                });
                                this.sendData();
                             }}
                            >
                                delete
                            </button>
                        </div>
        })
        return (
            <div id='box-status'>

                {box_list}
            </div>
        );
    }

}

export default DisplayStat;
