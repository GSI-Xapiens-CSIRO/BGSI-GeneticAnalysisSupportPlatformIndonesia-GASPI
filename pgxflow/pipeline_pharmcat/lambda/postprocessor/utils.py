import base64


def is_entering_array(current_state, prefix, event, array_prefix):
    """Check if we're entering a new array in the JSON steam."""
    return not current_state and prefix == array_prefix and event == "start_array"


def is_exiting_array(prefix, event, array_prefix):
    """Check if we're exiting an array in the JSON stream"""
    return prefix == array_prefix and event == "end_array"


def is_entering_map(prefix, event, map_prefix):
    """Check if we're entering a map in the JSON stream"""
    return prefix == map_prefix and event == "start_map"


def is_exiting_map(prefix, event, map_prefix):
    """Check if we're exiting a map in the JSON stream"""
    return prefix == map_prefix and event == "end_map"


def create_b64_id(*args):
    """
    Create a base64 encoded ID by joining multiple properties

    Args:
        Any number of arguments

    Returns:
        str: A base64 encoded string ID
    """
    joined_string = "_".join(str(arg) for arg in args)
    id_bytes = joined_string.encode("utf-8")
    id_b64 = base64.b64encode(id_bytes).decode("utf-8")
    return id_b64
