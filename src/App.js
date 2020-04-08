import React from "react";
import Amplify, { API, Auth } from "aws-amplify";
import ImageUploader from "react-images-upload";
import DisplayImage from "./utils/DisplayImage"
import DisplayStat from "./utils/DisplayStat"
import "./App.css";
import Modal from 'react-modal';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import NumPad from 'react-numpad';

// import 'bootstrap/dist/css/bootstrap.min.css';

var cognito = require("amazon-cognito-identity-js"); // for authenticating with AWS Cognito Pool
var AWS = require("aws-sdk"); // to get AWS credentials and access AWS
const crypto = require("crypto"); // to sign our pre-signed URL
const v4 = require("aws-signature-v4"); // to generate our pre-signed URL
const marshaller = require("@aws-sdk/eventstream-marshaller"); // for converting binary event stream messages to and from JSON
const util_utf8_node = require("@aws-sdk/util-utf8-node"); // utilities for encoding and decoding UTF8

let creds;
let encoded_img;
let response;
let json_result;

/*
AMPLIFY SETTINGS
*/
var REACT_APP_IDENTITY_POOL_ID =
  "us-east-1:b90b974c-557a-4139-85d5-463375f89ad9";
var REACT_APP_REGION = "us-east-1";
var REACT_APP_USER_POOL_ID = "us-east-1_lPVPRrJM1";
var REACT_APP_USER_POOL_WEB_CLIENT_ID = "4sm9bfgi6obvrtqqjr7pbakoqp";
var REACT_APP_MQTT_ID = "rev/inventory";

Amplify.configure({
  Auth: {
    identityPoolId: REACT_APP_IDENTITY_POOL_ID,
    region: REACT_APP_REGION,
    userPoolId: REACT_APP_USER_POOL_ID,
    userPoolWebClientId: REACT_APP_USER_POOL_WEB_CLIENT_ID
  },
  API: {
    endpoints: [
      {
        name: "cfaitinnovnp-rev-inventory-inference",
        endpoint: "https://twe29cb4hj.execute-api.us-east-1.amazonaws.com",
        custom_header: async () => {
          return {
            Authorization: `Bearer ${(await Auth.currentSession())
              .getAccessToken()
              .getJwtToken()}`
          };
        }
      }
    ]
  }
});


/*
COGNITO AUTHENTICATION
*/
var authParams = {
  Username: "rev-inventory-user", // dummy account created for cognito user pool
  Password: "cfacfa", // probably shouldn't store the credentials like this but here it is
  IdentityPoolId: REACT_APP_IDENTITY_POOL_ID,
  UserPoolId: REACT_APP_USER_POOL_ID,
  ClientId: REACT_APP_USER_POOL_WEB_CLIENT_ID,
  Region: REACT_APP_REGION
  // Bucket: 'cfaitinnovnp.dt-audiofiles' //the bucket that stores .wav files
};
// Setting up the Cognito User Authentication
var authenticationData = {
  Password: authParams.Password
};

var authenticationDetails = new cognito.AuthenticationDetails(
  authenticationData
);
// console.log(authenticationDetails)
var poolData = {
  UserPoolId: authParams.UserPoolId,
  ClientId: authParams.ClientId
};

var userPool = new cognito.CognitoUserPool(poolData);
// console.log(userPool)
var userData = {
  Username: authParams.Username,
  Pool: userPool
};
var cognitoUser = new cognito.CognitoUser(userData);
// console.log(cognitoUser)
// Authenticating User

cognitoUser.authenticateUser(authenticationDetails, {
  onSuccess: result => {
    let cognitoUserPoolLoginProvider =
      "cognito-idp." +
      authParams.Region +
      ".amazonaws.com/" +
      authParams.UserPoolId;
    var logins = {};
    logins[cognitoUserPoolLoginProvider] = result.getIdToken().getJwtToken();
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: authParams.IdentityPoolId,
      Logins: logins
    });
    AWS.config.update({
      region: authParams.Region
    });
    //retrieves credentials if you need them
    // console.log(AWS.config)
    AWS.config.credentials.get(function() {
      // Credentials will be available when this function is called.
      creds = {
        accessKeyId: AWS.config.credentials.accessKeyId,
        secretAccessKey: AWS.config.credentials.secretAccessKey,
        sessionToken: AWS.config.credentials.sessionToken
      };
      // use this to extract credentials
      cognitoUser.creds = creds;

    });

  },
  onFailure: function(err) {
    console.log("Cognito Authentication Failed", err);
    alert(err.message);
  }
});
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
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      picture: null,
      uploaded: false,
      sent: false,
      num_box :  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      modalIsOpen : false
    };
    this.onDrop = this.onDrop.bind(this);
    this.postImage = this.postImage.bind(this);
    this.sendToIOT = this.sendToIOT.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.openModal = this.openModal.bind(this);
  }
  onDrop(picture) {
    console.log(picture);
    this.setState({
      picture: URL.createObjectURL(picture[0]),
      uploaded: true,
      file: picture
    });
  }

  async postImage(props) {
    // console.log("button clicked")
    const reader = new FileReader();

    let blob = await fetch(this.state.picture).then(response =>
      response.blob()
    );
    let base64data = null;
    let count_arr =  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let gotReponse = false;
    reader.readAsDataURL(blob);
    const scope = this;
    reader.onload = async function(setState) {
      base64data = reader.result;
      base64data = base64data.substr(
        base64data.indexOf(",") + 1,
        base64data.length
      );

      const results = await fetch(
        "https://uhfb5dp698.execute-api.us-east-1.amazonaws.com/default/cfaitinnovnp-inventory-inference",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64data })
        }
    )
        .then(data => {
          return data.json();
        })
        .then(res => {
          console.log(res);
          for (var i = 0; i < res.length; i++) {
            var obj = res[i];
            if (obj["type"] == 1) {
              switch (obj["color"]) {
                case "blue":
                  count_arr[0]++;
                  break;
                case "orange":
                  count_arr[1]++;
                  break;
                case "tan":
                  count_arr[2]++;
                  break;
                case "yellow":
                  count_arr[3]++;
                  break;
                case "green":
                  count_arr[4]++;
                  break;
                case "pink":
                  count_arr[5]++;
                  break;
                case "purple":
                  count_arr[6]++;
                  break;
                case "gray":
                  count_arr[7]++;
              }
            } else if (obj["type"] == 2) {
              count_arr[8]++;
            } else if (obj["type"] == 3) {
              count_arr[9]++;
            }
          }
          scope.setState({
              num_box : count_arr,
              sent : true
          });
        })
        .catch(error => console.log(error));
      // update count dict with the inferred result
    };
  }

  async sendToIOT() {
    let count_arr = this.state.num_box;
    let final_json = {
      __store_id: 1,
      __time: new Date(),
      __type: "increment",
      _fries: count_arr[8],
      _shake: count_arr[9],
      blue: count_arr[0],
      gray: count_arr[7],
      green: count_arr[4],
      orange: count_arr[1],
      pink: count_arr[5],
      purple: count_arr[6],
      tan: count_arr[2],
      yellow: count_arr[3]
    };
    console.log(final_json);

    const iot_results = await fetch(
      "https://22pvlueb41.execute-api.us-east-1.amazonaws.com/default/cfaitinnovnp-inventory-publisher",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(final_json)
      }
    )
      .then(data => {
        return data.json();
      })
      .then(res => {
        console.log(res);
      })
      .catch(error => console.log(error));
  }

  onCancel(props) {
      this.setState({
          file: null,
          picture: null,
          uploaded: false,
          sent:false
        })
  }
  openModal() {
      this.setState({
          modalIsOpen : !this.state.modalIsOpen
      })
  }
  callbackFunction = (childData) => {
      this.setState({num_box: childData})
  }
  render() {
    console.log(this.state);
    const edit_list = this.state.num_box.map( (b, i) =>{
            return this.state.num_box[i] === 0 && <div style={{width:'auto', height:'auto'}}>
                <NumPad.Number className="box-entry"
                        key = {i}
                        onChange={(value) => {
                            let changed = this.state.num_box;
                            changed[i] = parseInt(value);
                            this.setState({
                                num_box : changed
                            });
                         }}
                        position={"startBottomLeft"}
                        value={this.state.num_box[i]}
                        decimal={1}
                        negative={false}
                        >
                          <div className="header">
        Inventory Management App</div>
                            <div className="box-entry">
                                {box_dict[i]}

                            </div>

                        </NumPad.Number>
                    </div>
    })
    return (
      <div className="App" style={{width:'100%', height:'100%'}}>
        <div className="left-container">
          <div className="DisplayImage" >
            {!this.state.uploaded && <ImageUploader
              withIcon={true}
              buttonText="Choose images"
              onChange={this.onDrop}
              imgExtension={[".jpg", ".gif", ".png", ".gif"]}
              maxFileSize={5242880}
            />}
            {this.state.uploaded && <img className="center" style={{maxHeight: '100%', maxWidth:'100%'}} src={this.state.picture} />}
          </div>
          <div horizontal="true">
              <button className="button" onClick={this.postImage}>Send</button>
              {this.state.uploaded && <button className="button" onClick={this.onCancel}>Cancel</button>}
          </div>
        </div>
        <div className="right-container">
            {!this.state.sent && <div id='box-status'></div>}
            {this.state.sent && <button onClick={this.openModal} style={{position:'fixed', top: '20%', right:'5%'}}>edit</button> }
            {this.state.modalIsOpen &&
                <div id='edit_table'>
                    {edit_list}
                </div>}
            {this.state.sent && <DisplayStat num_box = {this.state.num_box} parentCallback = {this.callbackFunction} box_dict ={box_dict}/>}
            <button className="button" onClick={this.sendToIOT}>Submit</button>
        </div>
      </div>
    );
  }
}

export default App;
