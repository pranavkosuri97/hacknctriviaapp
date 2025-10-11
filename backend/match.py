"""
This module handles game state. 

- Need to keep track of players, their scores, time left in match (depending on type of match), 
"""
import threading
class Match(threading.Thread):
    def __init__(self, players, match_id, match_type, questions):
        super().__init__()
        self.players = players  # List of player identifiers
        self.match_id = match_id
        self.match_type = match_type
        self.scores = {player: 0 for player in players}
        self.questions = questions
        self.active = True
    
    def 