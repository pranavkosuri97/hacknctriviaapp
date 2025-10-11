from constants import POINTS_CORRECT, GameActions
from player import Player, PlayerModel
from uuid import uuid4
import asyncio
from typing import Callable, Optional

class TriviaGame:
    def __init__(self, player1: PlayerModel, player2: PlayerModel, timer_length: int = 300, num_questions: int = 10):
        self.match_type = ""
        self.players = {"player1": Player(player1), "player2": Player(player2)}
        self.questions = TriviaGame.load_questions(num_questions) # load questions from database
        self.current_question_index = 0
        self.timer = timer_length
        self.id = uuid4()
        self.is_running = False
        self.is_finished = False
        self.event_callback: Optional[Callable] = None  # Callback to send events to manager

    def receive_answer(self, player, answer):
        if self.timer <= 0:
            return "timeout"
        if player == self.players["player1"].get_id():
            self.players["player1"].update_score(POINTS_CORRECT if answer == self.questions[self.current_question_index].answer else 0)
            self.current_question_index += 1
            return self.players["player1"].get_id()
        elif player == self.players["player2"].get_id():
            self.players["player2"].update_score(POINTS_CORRECT if answer == self.questions[self.current_question_index].answer else 0)
            self.current_question_index += 1
            return self.players["player2"].get_id()

    async def tick(self):
        # Handle game timer tick
        if self.timer > 0:
            self.timer -= 1
            return self.timer
        self.resolve_game()
        return 0

    def resolve_game(self):
        # Determine winner based on scores
        if self.players["player1"].score > self.players["player2"].score:
            return "player1"
        elif self.players["player2"].score > self.players["player1"].score:
            return "player2"
        else:
            return "draw"

    def get_question_number(self):
        return self.current_question_index + 1

    def get_number_questions(self):
        return len(self.questions)

    async def run_game_loop(self):
        """Run the main game loop - handles timing and game progression"""
        self.is_running = True
        
        try:
            # Send game start event
            await self._dispatch_event("game_started", {
                "game_id": str(self.id),
                "question": self.get_current_question(),
                "question_number": self.get_question_number(),
                "total_questions": self.get_number_questions()
            })
            
            # Main game loop
            while self.is_running and not self.is_finished:
                # Handle timer tick
                remaining_time = await self.tick()
                
                # Broadcast timer update every second
                await self._dispatch_event("timer_update", {
                    "time_remaining": remaining_time,
                    "question_number": self.get_question_number()
                })
                
                # Check if game should end
                if remaining_time <= 0 or self.current_question_index >= len(self.questions):
                    await self._end_game()
                    break
                
        except Exception as e:
            await self._dispatch_event("game_error", {"error": str(e)})
            self.is_running = False
            
    async def _end_game(self):
        """Handle game ending logic"""
        self.is_finished = True
        self.is_running = False
        
        winner = self.resolve_game()
        await self._dispatch_event("game_ended", {
            "winner": winner,
            "final_scores": self.get_scores(),
            "game_id": str(self.id)
        })
    
    def set_event_callback(self, callback: Callable):
        """Set the callback function to send events to the manager"""
        self.event_callback = callback
        
    async def _dispatch_event(self, event_type: str, data: dict):
        """Send events to the manager if callback is set"""
        if self.event_callback:
            await self.event_callback(event_type, data)
    
    def get_current_question(self):
        """Get the current question data"""
        if self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None
    
    def get_scores(self):
        """Get current scores for both players"""
        return {
            "player1": self.players["player1"].get_score(),
            "player2": self.players["player2"].get_score()
        }
    
    def stop_game(self):
        """Stop the game loop"""
        self.is_running = False
    
    def perform_action(self, action):
        # Placeholder for performing actions like "skip", "50-50", etc.
        if action == GameActions.START:
            pass
        elif action == GameActions.ANSWER:
            pass
        elif action == GameActions.ADVANCE:
            pass
        elif action == GameActions.FINISH:
            pass

    def get_id(self):
        return self.id

    @staticmethod
    def load_questions(category: str, num_questions: int = 1):
        return [] * num_questions  # Placeholder for actual question loading logic
    
    