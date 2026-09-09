from src.ml import Dataset

dataset = Dataset(
    "testbed/sih-ipsec-analyzer_vm1/dataset",
    "ipsec_analyzer/backend/training",
)

dataset.build()

print("Training:", len(dataset.train))
print("Testing:", len(dataset.test))