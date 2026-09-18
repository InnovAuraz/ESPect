from __future__ import annotations

from src.ipsec import IPsecAnalysis

from .models import (
    SecurityAssessment,
    SecurityFinding,
    SecurityStatus,
    Severity,
)


class SecurityAssessor:
    def assess(
        self,
        analysis: IPsecAnalysis,
    ) -> SecurityAssessment:
        findings: list[SecurityFinding] = []
        deductions = 0

        if not analysis.ike_detected:
            findings.append(
                SecurityFinding(
                    severity=Severity.HIGH,
                    title="IKE negotiation not detected",
                    description=(
                        "No IKE negotiation was detected in the "
                        "captured traffic."
                    ),
                    recommendation=(
                        "Verify that IKE negotiation is present "
                        "and configured correctly."
                    ),
                )
            )
            deductions += 25

        if not analysis.esp_detected:
            findings.append(
                SecurityFinding(
                    severity=Severity.CRITICAL,
                    title="ESP traffic not detected",
                    description=(
                        "No ESP-protected traffic was detected "
                        "in the PCAP."
                    ),
                    recommendation=(
                        "Verify that IPsec ESP protection is "
                        "enabled for the VPN traffic."
                    ),
                )
            )
            deductions += 40

        if analysis.mode == "transport":
            findings.append(
                SecurityFinding(
                    severity=Severity.INFO,
                    title="Transport mode detected",
                    description=(
                        "The IPsec tunnel is operating in "
                        "transport mode."
                    ),
                    recommendation=(
                        "Use tunnel mode when full IP packet "
                        "encapsulation is required."
                    ),
                )
            )

        if analysis.ike_encryption is None:
            findings.append(
                SecurityFinding(
                    severity=Severity.MEDIUM,
                    title="IKE encryption could not be determined",
                    description=(
                        "The encryption algorithm used during "
                        "IKE negotiation could not be identified "
                        "from the captured traffic."
                    ),
                    recommendation=(
                        "Verify the configured IKE encryption "
                        "algorithm and ensure that negotiation "
                        "traffic is available for analysis."
                    ),
                )
            )
            deductions += 5

        if analysis.ike_integrity is None:
            findings.append(
                SecurityFinding(
                    severity=Severity.MEDIUM,
                    title="IKE integrity could not be determined",
                    description=(
                        "The integrity algorithm used during "
                        "IKE negotiation could not be identified."
                    ),
                    recommendation=(
                        "Verify the configured IKE integrity "
                        "algorithm."
                    ),
                )
            )
            deductions += 5

        if analysis.ike_dh_group is None:
            findings.append(
                SecurityFinding(
                    severity=Severity.MEDIUM,
                    title="IKE DH group could not be determined",
                    description=(
                        "The Diffie-Hellman group used during "
                        "IKE negotiation could not be identified."
                    ),
                    recommendation=(
                        "Verify the configured Diffie-Hellman "
                        "group."
                    ),
                )
            )
            deductions += 5

        if analysis.esp_encryption is None:
            findings.append(
                SecurityFinding(
                    severity=Severity.MEDIUM,
                    title="ESP encryption could not be determined",
                    description=(
                        "The ESP encryption algorithm could not "
                        "be determined from the captured traffic."
                    ),
                    recommendation=(
                        "Verify the configured ESP encryption "
                        "algorithm."
                    ),
                )
            )
            deductions += 5

        if analysis.esp_integrity is None:
            findings.append(
                SecurityFinding(
                    severity=Severity.MEDIUM,
                    title="ESP integrity could not be determined",
                    description=(
                        "The ESP integrity algorithm could not "
                        "be determined from the captured traffic."
                    ),
                    recommendation=(
                        "Verify the configured ESP integrity "
                        "algorithm."
                    ),
                )
            )
            deductions += 5

        if analysis.esp_pfs is False:
            findings.append(
                SecurityFinding(
                    severity=Severity.MEDIUM,
                    title="Perfect Forward Secrecy disabled",
                    description=(
                        "Perfect Forward Secrecy was explicitly "
                        "identified as disabled."
                    ),
                    recommendation=(
                        "Enable PFS for stronger protection of "
                        "individual IPsec security associations."
                    ),
                )
            )
            deductions += 10

        score = max(0, min(100, 100 - deductions))

        if any(
            finding.severity == Severity.CRITICAL
            for finding in findings
        ):
            status = SecurityStatus.CRITICAL
        elif any(
            finding.severity in {
                Severity.HIGH,
                Severity.MEDIUM,
            }
            for finding in findings
        ):
            status = SecurityStatus.WARNING
        else:
            status = SecurityStatus.SECURE

        return SecurityAssessment(
            score=score,
            status=status,
            findings=tuple(findings),
        )


if __name__ == "__main__":
    print(
        "SecurityAssessor is a library module and requires "
        "an IPsecAnalysis object."
    )