from enum import Enum

NUM_CHOICES = 4

class GameActions(str, Enum):
    START = "START"
    ANSWER = "ANSWER"
    ADVANCE = "ADVANCE"
    FINISH = "FINISH"