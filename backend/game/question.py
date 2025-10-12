from game.constants import NUM_CHOICES

class Question:
    def __init__(self, prompt, choices, answer, category=None, difficulty=None):
        # Input validation
        if not prompt or not prompt.strip():
            raise ValueError("Question prompt cannot be empty")
        
        if not isinstance(choices, list):
            raise ValueError("Choices must be a list")
            
        if len(choices) != NUM_CHOICES:
            raise ValueError(f"invalid number of choices provided ({len(choices)}). maximum is {NUM_CHOICES}.")
        
        self.prompt = prompt.strip()
        self.choices = [None] * NUM_CHOICES
        
        # Normalize index of correct answer to be 0-(NUM_CHOICES-1)
        if isinstance(answer, str):
            self.answer = (ord(answer.upper()) - ord("A")) % NUM_CHOICES
        else:
            self.answer = answer % NUM_CHOICES
            
        # Optional metadata
        self.category = category
        self.difficulty = difficulty
        
        for i in range(min(len(choices), NUM_CHOICES)):
            self.choices[i] = choices[i]
    
    def get_prompt(self):
        return self.prompt
    
    def get_choices(self):
        return self.choices

    def answer_correct(self, choice):
        # Handle both letter and numeric inputs
        if isinstance(choice, str):
            choice = (ord(choice.upper()) - ord("A")) % NUM_CHOICES
        return choice == self.answer
    
    def get_correct_answer_letter(self):
        """Returns the correct answer as a letter (A, B, C, D)"""
        return chr(ord("A") + self.answer)
    
    def get_correct_answer_text(self):
        """Returns the text of the correct answer choice"""
        return self.choices[self.answer]
    
    def __str__(self):
        """String representation of the question with choices"""
        result = f"{self.prompt}\n"
        for i, choice in enumerate(self.choices):
            if choice:  # Handle None values
                result += f"{chr(ord('A') + i)}. {choice}\n"
        return result.rstrip()