from pydantic import BaseModel
from constants import DEFAULT_ELO

class PlayerModel(BaseModel):
    name: str
    id: str
    elo: int = DEFAULT_ELO

    def get_elo(self):
        return self.elo
    
    def update_elo(self, new_elo):
        # call database to update elo
        self.elo = new_elo
    
class Player:
    def __init__(self, player: PlayerModel):
        self.playerModel = player
        self.score = 0

    def update_score(self, points):
        self.score += points

    def get_score(self):
        return self.score

    def get_elo(self):
        return self.playerModel.elo
    
    def get_id(self):
        return self.playerModel.id