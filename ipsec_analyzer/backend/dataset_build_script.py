from src.ml import Dataset

dataset = Dataset(
    "../../testbed/sih-ipsec-analyzer_vm1/dataset",
    "training",
)

dataset.build()

print("Training:", len(dataset.train))
print("Testing:", len(dataset.test))