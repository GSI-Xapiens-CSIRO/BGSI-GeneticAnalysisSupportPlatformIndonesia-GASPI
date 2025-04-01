import json
from typing import Dict, List, Optional

def get_page(index: Dict[str, Dict[str, List[int]]], page_num: int) -> Optional[Dict[str, int]]:
    """Gets a particular page"""
    if page_num not in index or page_num < 1:
        return None
    
    page_index = index[page_num]
    
    return {
        "page": page_num,
        "page_start_f": page_index["page_start_f"],
        "page_end_f": page_index["page_end_f"]
    }