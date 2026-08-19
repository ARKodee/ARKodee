# 🔒 Security Policy

We take the security of the Arkodee platform, user authentication credentials, and our secure sandbox code execution runner seriously. 

## Supported Versions

Only the latest release version of Arkodee is supported for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability or suspect a exploit in our code execution sandbox (e.g., breakout of the subprocess boundary, execution of unauthorized system commands, or resource exhaustion), please **do not open a public GitHub issue**. Instead, report it privately to the maintainers:

* **Primary Email**: [niharkakani@gmail.com](mailto:niharkakani@gmail.com)
* **Encryption Key**: If you wish to encrypt your message, please contact us at the above address to coordinate the exchange of a secure key.

### What to Include in Your Report
To help us evaluate and patch the vulnerability quickly, please include:
1. **Description**: A brief summary of the potential security issue.
2. **Impact**: The potential severity (e.g., Sandbox Escape, SQL Injection, Privilege Escalation).
3. **Step-by-step PoC**: Clear instructions, terminal commands, or code snippets needed to replicate the exploit.
4. **Environment Details**: Operating system, runtime versions, and configurations used during testing.

### Our Security Commitment
Once a report is submitted:
1. We will acknowledge receipt of your report within **24 to 48 hours**.
2. We will investigate the issue and coordinate a patch or mitigation strategy.
3. We will keep you updated throughout the verification and remediation process.
4. Once the issue is resolved, we will publish a security advisory and credit you for the discovery (unless you request anonymity).
