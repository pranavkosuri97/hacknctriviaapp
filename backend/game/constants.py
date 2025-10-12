from enum import Enum

NUM_CHOICES = 4
POINTS_CORRECT = 10

class GameActions(str, Enum):
    START = "START"
    ANSWER = "ANSWER"
    ADVANCE = "ADVANCE"
    FINISH = "FINISH"