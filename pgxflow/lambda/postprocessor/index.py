from collections import defaultdict
import io
from typing import Dict, List

def create_index(file: io.BytesIO) -> Dict[str, Dict[str, List]]:
    max_lines_per_page = 10_000
    max_size_per_page = 10 * 10**6
    index = defaultdict(lambda: defaultdict(list))
    lines_read = 0
    size_read = 0
    page_start_f = 0
    page_start_pos = None

    while line := file.readline():
        if len(line.strip()) == 0:
            continue
        
        start = line.split(b"\t")[2]
        
        if page_start_pos is None:
            page_start_pos = start
            
        if lines_read >= max_lines_per_page or size_read >= max_size_per_page:
            index[str(page_start_pos)]["page_start_f"].append(page_start_f)
            index[str(page_start_pos)]["page_end_f"].append(file.tell())

            page_start_pos = start
            page_start_f = file.tell()
            lines_read = 0
            size_read = 0
        
        lines_read += 1
        size_read += len(line)

    if lines_read > 0:
        index[str(page_start_pos)]["page_start_f"].append(page_start_f)
        index[str(page_start_pos)]["page_end_f"].append(file.tell())

    return index
