"""Audio and feature settings used to train the model.

These values must stay identical to the ones in research/song_detector.ipynb.
If they differ, the spectrograms the server computes won't match the ones the
model learned from, and accuracy drops without any error.
"""

SAMPLE_RATE = 22050  # Hz
CLIP_SECONDS = 5
CLIP_SAMPLES = SAMPLE_RATE * CLIP_SECONDS  # 110,250 samples per chunk

N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512
TOP_DB = 80

NUM_CLASSES = 10
