import os
from openai import OpenAI

ai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_explanation(question: str, correct_answer: str) -> str:
    """
    Given a trivia question and its correct answer, generates a concise, clear explanation
    that helps the user understand the concept or context behind the answer.

    Parameters:
        question (str): The trivia question text.
        correct_answer (str): The correct answer to the question.

    Returns:
        str: A short, explanatory string providing helpful context or reasoning.
    """
    prompt = f"""
    Explain briefly why the correct answer makes sense.

    Question: {question}
    Answer: {correct_answer}

    Rules:
    - 1-2 sentences max.
    - Be factual and clear.
    - No restating the question or saying 'the correct answer is'.
    """

    try:
        response = ai.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": "You are a concise, helpful trivia explanation assistant."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=50,
            temperature=0.6,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"(Explanation unavailable: {e})"