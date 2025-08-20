import json
import os

PHARMCAT_ORGANISATIONS = json.loads(os.environ.get("PHARMCAT_ORGANISATIONS"))
PHARMCAT_GENES = os.environ.get("PHARMCAT_GENES")
PHARMCAT_DRUGS = os.environ.get("PHARMCAT_DRUGS")


def check_pharmcat_configuration():
    vars_to_check = {
        "PHARMCAT_ORGANISATIONS": PHARMCAT_ORGANISATIONS,
        "PHARMCAT_GENES": PHARMCAT_GENES,
        "PHARMCAT_DRUGS": PHARMCAT_DRUGS,
    }
    for var_name, var_value in vars_to_check.items():
        if not var_value:
            return (
                False,
                f"{var_name} environment variable is not set. Please contact an AWS administrator.",
            )
    return True, None
