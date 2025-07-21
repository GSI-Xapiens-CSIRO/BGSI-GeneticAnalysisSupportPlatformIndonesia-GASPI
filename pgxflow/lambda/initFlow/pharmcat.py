import json
import os

ORGANISATIONS = json.loads(os.environ.get("PHARMCAT_ORGANISATIONS"))
GENES = os.environ.get("PHARMCAT_GENES")
DRUGS = os.environ.get("PHARMCAT_DRUGS")


def check_pharmcat_configuration():
    if not ORGANISATIONS:
        return (
            False,
            "ORGANISATIONS environment variable is not set. Please contact an AWS administrator.",
        )
    if not GENES:
        return (
            False,
            "GENES environment variable is not set. Please contact an AWS administrator.",
        )
    if not DRUGS:
        return (
            False,
            "DRUGS environment variable is not set. Please contact an AWS administrator.",
        )
    return True, None
