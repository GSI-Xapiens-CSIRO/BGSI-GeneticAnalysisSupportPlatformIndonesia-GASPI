import json
import os

import boto3
from markupsafe import escape

BUI_SSM_PARAM_NAME = os.environ["BUI_SSM_PARAM_NAME"]
SES_SOURCE_EMAIL = os.environ["SES_SOURCE_EMAIL"]
SES_CONFIG_SET_NAME = os.environ["SES_CONFIG_SET_NAME"]
ses_client = boto3.client("ses")
ssm_client = boto3.client("ssm")


def lambda_handler(event, context):
    print(f"Event received: {json.dumps(event)}")
    try:
        body_dict = event.get("body")
        email = body_dict["email"]
        first_name = body_dict["first_name"]
        last_name = body_dict["last_name"]
        temp_password = body_dict["temporary_password"]

        response = ssm_client.get_parameter(Name=BUI_SSM_PARAM_NAME)
        beacon_ui_url = response.get("Parameter", {}).get("Value", "")

        beacon_ui_url = f"{beacon_ui_url}/login"
        beacon_img_url = f"{beacon_ui_url}/assets/images/sbeacon.png"
        subject = "sBeacon Registration"
        body_html = f"""
<html>
  <head>
    <style>
      body {{
        font-family: Arial, sans-serif;
        color: #333;
      }}
      .container {{
        max-width: 600px;
        margin: auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
        background-color: #f9f9f9;
      }}
      h1 {{
        color: #33548e;
      }}
      p {{
        line-height: 1.6;
      }}
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Hello {escape(first_name)} {escape(last_name)},</h1>
      <p>Welcome to sBeacon - your sign-in credentials are as follows:</p>
      <p>Email: <strong>{escape(email)}</strong></p>
      <p>Temporary Password: <strong>{escape(temp_password)}</strong></p>
      <p><a href="{beacon_ui_url}">Access your account</a></p>
      <div style="max-width:80;">
        <img src="{beacon_img_url}" alt="sBeacon Logo" style="max-width:80%; width:80%; margin-top:20px;">
      </div>
    </div>
  </body>
</html>
"""
        response = ses_client.send_email(
            Destination={
                "ToAddresses": [email],
            },
            Message={
                "Body": {
                    "Html": {
                        "Charset": "UTF-8",
                        "Data": body_html,
                    },
                    "Text": {
                        "Charset": "UTF-8",
                        "Data": f"Hello {first_name} {last_name},\n\nWelcome to sBeacon - your sign-in credentials are as follows:\n\nEmail: {email}\n\nPassword: {temp_password}\n\nVerify: {beacon_ui_url}",
                    },
                },
                "Subject": {
                    "Charset": "UTF-8",
                    "Data": subject,
                },
            },
            Source=SES_SOURCE_EMAIL,
            ReturnPath=SES_SOURCE_EMAIL,
            ConfigurationSetName=SES_CONFIG_SET_NAME,
        )
        print(f"Email sent with message ID: {response["MessageId"]}")
        return {
            "statusCode": 200,
            "success": True,
            "message": "Email sent successfully",
        }

    except ValueError as e:
        return {
            "statusCode": 400,
            "success": False,
            "message": str(e),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "success": False,
            "message": "Internal server error",
        }
