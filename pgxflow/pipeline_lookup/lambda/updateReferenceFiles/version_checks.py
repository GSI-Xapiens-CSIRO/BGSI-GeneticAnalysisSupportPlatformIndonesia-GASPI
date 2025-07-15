from shared.utils import fetch_remote_content, query_references_table

DBSNP_MD5_URL = (
    "https://ftp.ncbi.nlm.nih.gov/snp/organisms/human_9606/VCF/00-All.vcf.gz.md5"
)


def check_dbsnp_version():
    id = "dbsnp_version"
    local_dbsnp_version = query_references_table(id)
    dbsnp_md5_content = fetch_remote_content(DBSNP_MD5_URL).decode("utf-8")
    latest_dbsnp_version = dbsnp_md5_content.strip().split(" ")[0]
    return latest_dbsnp_version != local_dbsnp_version, latest_dbsnp_version
