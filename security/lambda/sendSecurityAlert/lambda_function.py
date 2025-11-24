import json

from inspector import send_inspector_alert


def lambda_handler(event, _):
    print("Event Received: {}".format(json.dumps(event)))
    if event.get("source") == "aws.inspector2":
        return send_inspector_alert(event)