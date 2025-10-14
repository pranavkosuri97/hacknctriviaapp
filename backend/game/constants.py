from enum import Enum

NUM_CHOICES = 4
POINTS_CORRECT = 10

class GameEvents(str, Enum):
    START = "game_start"
    ANSWER = "answer_submitted"
    ADVANCE = "advance_question"
    FINISH = "game_ended"
    ERROR = "game_error"
    TICK = "timer_update"