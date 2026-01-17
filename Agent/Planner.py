import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
load_dotenv()

# # The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client(api_key=os.getenv("Gemini_api_key"))

chat = client.chats.create(model="gemini-3-flash-preview")

temp='.'
while True:
    temp=input("give input: ")
    if temp=='exit':
        break
    response=chat.send_message_stream(temp)
    for chunk in response:
        print(chunk.text)
