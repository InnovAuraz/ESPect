from src.experiment.state import load, save


def test_save_and_load(tmp_path):
    path = tmp_path / "state.json"
    coordinate = [1, 2, 0, 3, 1, 0, 4]

    save(path, coordinate)

    assert load(path) == coordinate


def test_load_invalid_state(tmp_path):
    path = tmp_path / "state.json"
    path.write_text('{"coordinate": [1, 2, 3]}')

    try:
        load(path)
        assert False
    except ValueError:
        pass


def test_load_non_integer_coordinate(tmp_path):
    path = tmp_path / "state.json"
    path.write_text('[1, 2, "3"]')

    try:
        load(path)
        assert False
    except ValueError:
        pass