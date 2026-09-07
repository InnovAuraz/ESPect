from pathlib import Path

import pytest

from src.agent.ipsec import (
    IPsecConfigError,
    build,
    write,
)


def base_configuration():
    return {
        "ipsec_mode": "transport",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv4",
    }


def test_aes128_cbc_mapping():
    configuration = base_configuration()

    result = build(
        configuration,
        "192.168.160.128",
        "192.168.160.129",
    )

    assert "proposals = aes128-sha256-modp2048" in result
    assert "esp_proposals = aes128-sha256" in result


def test_aes256_cbc_mapping():
    configuration = base_configuration()
    configuration["encryption"] = "aes256-cbc"

    result = build(
        configuration,
        "192.168.160.128",
        "192.168.160.129",
    )

    assert "proposals = aes256-sha256-modp2048" in result
    assert "esp_proposals = aes256-sha256" in result


def test_aes128_gcm_mapping():
    configuration = base_configuration()
    configuration["encryption"] = "aes128-gcm16"
    configuration["integrity"] = "none-aead"

    result = build(
        configuration,
        "192.168.160.128",
        "192.168.160.129",
    )

    assert "proposals = aes128gcm16-prfsha256-modp2048" in result
    assert "esp_proposals = aes128gcm16" in result


def test_aes256_gcm_mapping():
    configuration = base_configuration()
    configuration["encryption"] = "aes256-gcm16"
    configuration["integrity"] = "none-aead"

    result = build(
        configuration,
        "192.168.160.128",
        "192.168.160.129",
    )

    assert "proposals = aes256gcm16-prfsha256-modp2048" in result
    assert "esp_proposals = aes256gcm16" in result


def test_pfs_adds_dh_group_to_esp():
    configuration = base_configuration()
    configuration["pfs"] = True

    result = build(
        configuration,
        "192.168.160.128",
        "192.168.160.129",
    )

    assert "esp_proposals = aes128-sha256-modp2048" in result


def test_transport_selectors_use_outer_addresses():
    configuration = base_configuration()

    result = build(
        configuration,
        "192.168.160.128",
        "192.168.160.129",
    )

    assert "mode = transport" in result
    assert "local_ts = 192.168.160.128/32" in result
    assert "remote_ts = 192.168.160.129/32" in result


def test_tunnel_requires_inner_addresses():
    configuration = base_configuration()
    configuration["ipsec_mode"] = "tunnel"

    with pytest.raises(
        IPsecConfigError,
        match="Tunnel mode requires local_inner_address",
    ):
        build(
            configuration,
            "192.168.160.128",
            "192.168.160.129",
        )


def test_tunnel_requires_remote_inner_address():
    configuration = base_configuration()
    configuration["ipsec_mode"] = "tunnel"

    with pytest.raises(
        IPsecConfigError,
        match="Tunnel mode requires remote_inner_address",
    ):
        build(
            configuration,
            "192.168.160.128",
            "192.168.160.129",
            "10.10.1.1",
        )


def test_tunnel_uses_inner_addresses():
    configuration = base_configuration()
    configuration["ipsec_mode"] = "tunnel"

    result = build(
        configuration,
        "192.168.160.128",
        "192.168.160.129",
        "10.10.1.1",
        "10.10.2.1",
    )

    assert "mode = tunnel" in result

    assert "local_addrs = 192.168.160.128" in result
    assert "remote_addrs = 192.168.160.129" in result

    assert "local_ts = 10.10.1.1/32" in result
    assert "remote_ts = 10.10.2.1/32" in result


def test_ipv6_transport_selectors():
    configuration = base_configuration()
    configuration["ip_version"] = "ipv6"

    result = build(
        configuration,
        "2001:db8::1",
        "2001:db8::2",
    )

    assert "local_ts = 2001:db8::1/128" in result
    assert "remote_ts = 2001:db8::2/128" in result


def test_ipv6_tunnel_selectors():
    configuration = base_configuration()
    configuration["ipsec_mode"] = "tunnel"
    configuration["ip_version"] = "ipv6"

    result = build(
        configuration,
        "2001:db8::1",
        "2001:db8::2",
        "2001:db8:1::1",
        "2001:db8:2::1",
    )

    assert "mode = tunnel" in result
    assert "local_ts = 2001:db8:1::1/128" in result
    assert "remote_ts = 2001:db8:2::1/128" in result


def test_invalid_mode():
    configuration = base_configuration()
    configuration["ipsec_mode"] = "invalid"

    with pytest.raises(
        IPsecConfigError,
        match="Unsupported IPsec mode",
    ):
        build(
            configuration,
            "192.168.160.128",
            "192.168.160.129",
        )


def test_invalid_encryption():
    configuration = base_configuration()
    configuration["encryption"] = "invalid"

    with pytest.raises(
        IPsecConfigError,
        match="Unsupported encryption",
    ):
        build(
            configuration,
            "192.168.160.128",
            "192.168.160.129",
        )


def test_missing_configuration():
    configuration = base_configuration()
    del configuration["dh_group"]

    with pytest.raises(
        IPsecConfigError,
        match="Missing configuration values",
    ):
        build(
            configuration,
            "192.168.160.128",
            "192.168.160.129",
        )


def test_write(tmp_path: Path):
    configuration = base_configuration()

    path = tmp_path / "learning.conf"

    write(
        path,
        configuration,
        "192.168.160.128",
        "192.168.160.129",
    )

    assert path.exists()

    content = path.read_text(
        encoding="utf-8"
    )

    assert "learning-vpn" in content
    assert "learning-child" in content
    assert "mode = transport" in content