from datetime import datetime
import json
import os
from urllib.parse import urlparse
import boto3

ses_client = boto3.client("ses")
SES_SOURCE_EMAIL = os.environ["SES_SOURCE_EMAIL"]
GASPI_ADMIN_EMAIL = os.environ["GASPI_ADMIN_EMAIL"]


def send_inspector_alert(event):
    detail = event.get("detail", {})
    
    severity = detail.get("severity", "UNKNOWN")
    title = detail.get("title", "Unknown Vulnerability")
    description = detail.get("description", "No description provided")
    
    resources = detail.get("resources", [])
    if not resources:
        resource_type = "Unknown"
        resource_name = "Unknown"
    else:
        resource = resources[0]
        resource_type = resource.get("type", "Unknown")
        
        if resource_type == "AWS_LAMBDA_FUNCTION":
            function_details = resource.get("details", {}).get("awsLambdaFunction", {})
            resource_name = function_details.get("functionName", "Unknown Lambda")
        elif resource_type == "AWS_ECR_CONTAINER_IMAGE":
            ecr_details = resource.get("details", {}).get("awsEcrContainerImage", {})
            resource_name = ecr_details.get("repositoryName", "Unknown ECR Repository")
        else:
            resource_name = resource.get("id", "Unknown Resource")
    
    vuln_details = detail.get("packageVulnerabilityDetails", {})
    cve_id = vuln_details.get("vulnerabilityId", "Unknown CVE")
    reference_urls = vuln_details.get("referenceUrls", [])
    nvd_url = next((url for url in reference_urls if urlparse(url).hostname == "nvd.nist.gov"), "No NVD link available")
    
    vulnerable_packages = vuln_details.get("vulnerablePackages", [])
    package_info = []
    for pkg in vulnerable_packages:
        package_info.append({
            "name": pkg.get("name", "Unknown"),
            "version": pkg.get("version", "Unknown"),
            "fixed_version": pkg.get("fixedInVersion", "Unknown")
        })
    
    fix_available = detail.get("fixAvailable", "UNKNOWN")
    
    subject = f"SECURITY ALERT: {severity} - {cve_id} affecting {resource_name}"
    
    body_html = f"""
    <html>
      <head>
        <style>
          body {{
            font-family: Arial, sans-serif;
            color: #333;
          }}
          .container {{
            max-width: 800px;
            margin: auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
          }}
          h1 {{
            color: #d13212;
          }}
          h2 {{
            color: #33548e;
          }}
          p {{
            line-height: 1.6;
          }}
          .severity {{
            font-weight: bold;
            color: {'#d13212' if severity in ['CRITICAL', 'HIGH'] else '#ff9900' if severity == 'MEDIUM' else '#2b7d2b'};
          }}
          .details {{
            margin: 20px 0;
            padding: 15px;
            background-color: #fff;
            border-left: 4px solid #33548e;
          }}
          table {{
            border-collapse: collapse;
            width: 100%;
          }}
          th, td {{
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }}
          th {{
            background-color: #f2f2f2;
          }}
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Security Vulnerability Alert</h1>
          <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
          <p><strong>Severity:</strong> <span class="severity">{severity}</span></p>
          <p><strong>CVE:</strong> <a href="{nvd_url}">{cve_id}</a></p>
          <p><strong>Resource Type:</strong> {resource_type}</p>
          <p><strong>Resource Name:</strong> {resource_name}</p>
          <p><strong>Fix Available:</strong> {fix_available}</p>
          
          <div class="details">
            <h2>Vulnerability Details</h2>
            <p><strong>{title}</strong></p>
            <p>{description}</p>
          </div>
          
          <h2>Affected Packages</h2>
          <table>
            <tr>
              <th>Package</th>
              <th>Current Version</th>
              <th>Fixed Version</th>
            </tr>
    """
    
    for pkg in package_info:
        body_html += f"""
            <tr>
              <td>{pkg['name']}</td>
              <td>{pkg['version']}</td>
              <td>{pkg['fixed_version']}</td>
            </tr>
        """
    
    body_html += f"""
          </table>
          
          <h2>Remediation Steps</h2>
          <p>1. Update the affected packages to the fixed version</p>
          <p>2. Redeploy the affected resource</p>
          <p>3. Verify the vulnerability has been resolved</p>
          
          <p>For more information, visit: <a href="{nvd_url}">{nvd_url}</a></p>
          
          <p>This is an automated security alert. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
    """
    
    try:
        response = ses_client.send_email(
            Source=SES_SOURCE_EMAIL,
            Destination={
                'ToAddresses': [GASPI_ADMIN_EMAIL]
            },
            Message={
                'Subject': {
                    'Data': subject
                },
                'Body': {
                    'Html': {
                        'Data': body_html
                    }
                }
            }
        )
        print(f"Email sent successfully: {response}")
    except Exception as e:
        print(f"Error sending email: {e}")
        raise e
    
    return {
        'statusCode': 200,
        'body': json.dumps('Security alert processed successfully')
    }