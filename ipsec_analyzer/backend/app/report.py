from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .schemas import AnalysisResponse


def generate_report(
    result: AnalysisResponse,
) -> BytesIO:
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    body_style = styles["BodyText"]

    story = []

    story.append(
        Paragraph(
            "ESPect Security Assessment Report",
            title_style,
        )
    )

    story.append(Spacer(1, 8))

    # ---------------------------------------------------------
    # IPsec Analysis
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "IPsec Analysis",
            heading_style,
        )
    )

    ipsec = result.ipsec

    ipsec_data = [
        ["Property", "Value"],
        ["IP Version", ipsec.ip_version or "Unknown"],
        ["IKE Detected", str(ipsec.ike_detected)],
        ["IKE Version", ipsec.ike_version or "Unknown"],
        [
            "IKE Exchange Types",
            ", ".join(ipsec.ike_exchange_types)
            if ipsec.ike_exchange_types
            else "Unknown",
        ],
        [
            "IKE Encryption",
            ipsec.ike_encryption or "Unknown",
        ],
        [
            "IKE Integrity",
            ipsec.ike_integrity or "Unknown",
        ],
        [
            "IKE PRF",
            ipsec.ike_prf or "Unknown",
        ],
        [
            "IKE DH Group",
            ipsec.ike_dh_group or "Unknown",
        ],
        ["ESP Detected", str(ipsec.esp_detected)],
        ["ESP Packets", str(ipsec.esp_packet_count)],
        ["ESP Bytes", str(ipsec.esp_bytes)],
        [
            "ESP SPIs",
            ", ".join(str(spi) for spi in ipsec.esp_spis)
            if ipsec.esp_spis
            else "None",
        ],
        [
            "ESP Encryption",
            ipsec.esp_encryption or "Unknown",
        ],
        [
            "ESP Integrity",
            ipsec.esp_integrity or "Unknown",
        ],
        [
            "ESP PFS",
            (
                str(ipsec.esp_pfs)
                if ipsec.esp_pfs is not None
                else "Unknown"
            ),
        ],
        [
            "Source Addresses",
            ", ".join(ipsec.source_addresses)
            if ipsec.source_addresses
            else "None",
        ],
        [
            "Destination Addresses",
            ", ".join(ipsec.destination_addresses)
            if ipsec.destination_addresses
            else "None",
        ],
        ["IPsec Mode", ipsec.mode or "Unknown"],
    ]

    ipsec_table = Table(
        ipsec_data,
        colWidths=[55 * mm, 125 * mm],
    )

    ipsec_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.lightgrey,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
            ]
        )
    )

    story.append(ipsec_table)
    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # Traffic Classification
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "Traffic Classification",
            heading_style,
        )
    )

    traffic_data = [
        ["Property", "Value"],
        [
            "Predicted Traffic Type",
            result.traffic.predicted_type,
        ],
        [
            "Confidence",
            f"{result.traffic.confidence:.4f}",
        ],
    ]

    traffic_table = Table(
        traffic_data,
        colWidths=[55 * mm, 125 * mm],
    )

    traffic_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.lightgrey,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
            ]
        )
    )

    story.append(traffic_table)
    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # Security Assessment
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "Security Assessment",
            heading_style,
        )
    )

    security = result.security

    security_data = [
        ["Property", "Value"],
        ["Security Score", str(security.score)],
        ["Status", security.status],
    ]

    security_table = Table(
        security_data,
        colWidths=[55 * mm, 125 * mm],
    )

    security_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.lightgrey,
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
            ]
        )
    )

    story.append(security_table)
    story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # Findings
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "Security Findings",
            heading_style,
        )
    )

    if not security.findings:
        story.append(
            Paragraph(
                "No security findings were reported.",
                body_style,
            )
        )
    else:
        for index, finding in enumerate(
            security.findings,
            start=1,
        ):
            story.append(
                Paragraph(
                    f"<b>{index}. "
                    f"{finding.title}</b>",
                    body_style,
                )
            )

            story.append(
                Paragraph(
                    f"<b>Severity:</b> "
                    f"{finding.severity}",
                    body_style,
                )
            )

            story.append(
                Paragraph(
                    finding.description,
                    body_style,
                )
            )

            story.append(
                Paragraph(
                    f"<b>Recommendation:</b> "
                    f"{finding.recommendation}",
                    body_style,
                )
            )

            story.append(Spacer(1, 8))

    document.build(story)

    buffer.seek(0)

    return buffer