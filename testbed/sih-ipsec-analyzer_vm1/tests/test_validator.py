from src.experiment.validator import validate


def valid_configuration():
    return {
        "ipsec_mode": "transport",
        "encryption": "aes128-cbc",
        "integrity": "sha256",
        "dh_group": "modp2048",
        "pfs": False,
        "ip_version": "ipv4",
        "traffic_type": "icmp",
    }


def test_valid_configuration():
    assert validate(valid_configuration()) == []


def test_aead_requires_none_aead():
    configuration = valid_configuration()
    configuration["encryption"] = "aes128-gcm16"
    configuration["integrity"] = "sha256"

    errors = validate(configuration)

    assert len(errors) == 1


def test_aead_with_none_aead():
    configuration = valid_configuration()
    configuration["encryption"] = "aes128-gcm16"
    configuration["integrity"] = "none-aead"

    assert validate(configuration) == []


def test_cbc_cannot_use_none_aead():
    configuration = valid_configuration()
    configuration["integrity"] = "none-aead"

    errors = validate(configuration)

    assert len(errors) == 1


def test_missing_parameter():
    configuration = valid_configuration()
    del configuration["traffic_type"]

    errors = validate(configuration)

    assert "Missing parameter: traffic_type" in errors


def test_invalid_ipsec_mode():
    configuration = valid_configuration()
    configuration["ipsec_mode"] = "invalid"

    errors = validate(configuration)

    assert len(errors) == 1


def test_invalid_ip_version():
    configuration = valid_configuration()
    configuration["ip_version"] = "ipv5"

    errors = validate(configuration)

    assert len(errors) == 1
    
def test_invalid_dh_group():
    configuration = valid_configuration()
    configuration["dh_group"] = "invalid"

    errors = validate(configuration)

    assert len(errors) == 1


def test_invalid_pfs():
    configuration = valid_configuration()
    configuration["pfs"] = "yes"

    errors = validate(configuration)

    assert len(errors) == 1


def test_invalid_traffic_type():
    configuration = valid_configuration()
    configuration["traffic_type"] = "invalid"

    errors = validate(configuration)

    assert len(errors) == 1