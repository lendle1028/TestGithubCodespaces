#!/usr/bin/env python3
import sys
import time
import random
import platform
from datetime import datetime
import os

BOLD = "\033[1m"
RESET = "\033[0m"
COLORS = ["\033[91m", "\033[92m", "\033[93m", "\033[94m", "\033[95m", "\033[96m"]

ASCII_LOGO = r"""
 _   _      _ _        __        __         _     _
| | | | ___| | | ___   \ \      / /__  _ __| | __| |
| |_| |/ _ \ | |/ _ \   \ \/\/ / _ \| '__| |/ _` |
|  _  |  __/ | | (_) |   \  V  / (_) | |  | | (_| |
|_| |_|\___|_|_|\___/     \_/\_/ \___/|_|  |_|\__,_|
"""

GREETINGS = {
    "en": "Hello, {name}! Welcome!",
    "es": "Hola, {name}! Bienvenido!",
    "fr": "Bonjour, {name}! Bienvenue!",
    "de": "Hallo, {name}! Willkommen!",
    "it": "Ciao, {name}! Benvenuto!",
    "ja": "こんにちは, {name}! ようこそ！",
    "ko": "안녕하세요, {name}! 환영합니다!",
    "pt": "Olá, {name}! Bem-vindo!",
    "ru": "Привет, {name}! Добро пожаловать!",
    "zh": "你好, {name}! 欢迎！",
}

FACTS = [
    "The first computer bug was an actual bug found in a Harvard Mark II computer.",
    "Python was named after Monty Python, not the snake.",
    "The first programmer was Ada Lovelace, in the 1840s.",
    "There are more possible iterations of a game of chess than atoms in the universe.",
    "The first computer mouse was made of wood.",
    "A group of flamingos is called a 'flamboyance'.",
    "Octopuses have three hearts and blue blood.",
    "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs.",
]


def rainbow_text(text):
    colored = []
    for i, char in enumerate(text):
        colored.append(f"{COLORS[i % len(COLORS)]}{char}{RESET}")
    return "".join(colored)


def typewriter_effect(text, delay=0.03):
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print()


def countdown(seconds=3):
    for i in range(seconds, 0, -1):
        print(f"\r  Starting in {i}...", end="", flush=True)
        time.sleep(1)
    print("\r  Go!              ")


def show_system_info():
    print(f"\n  {BOLD}System Info:{RESET}")
    print(f"    OS       : {platform.system()} {platform.release()}")
    print(f"    Python   : {platform.python_version()}")
    print(f"    Machine  : {platform.machine()}")
    print(f"    User     : {os.environ.get("USER", os.environ.get("LOGNAME", "World"))}")


def show_time():
    now = datetime.now()
    print(f"\n  {BOLD}Current Time:{RESET} {now.strftime('%Y-%m-%d %H:%M:%S')}")


def show_random_fact():
    print(f"\n  {BOLD}Did You Know?{RESET}")
    typewriter_effect(f"  {random.choice(FACTS)}", delay=0.02)


def interactive_greeting():
    print(ASCII_LOGO)
    print(rainbow_text("  Feature-Rich Hello World!"))
    print("=" * 50)

    name = input("\n  What's your name? (or press Enter to skip): ").strip()
    name = name or os.environ.get("USER", os.environ.get("LOGNAME", "World"))

    show_time()
    show_system_info()
    countdown(1)

    greeting = random.choice(list(GREETINGS.values())).format(name=name)
    typewriter_effect(f"\n  {greeting}\n", delay=0.04)

    show_random_fact()

    print("\n" + "=" * 50)
    print(f"  {BOLD}Available languages:{RESET} {', '.join(GREETINGS.keys())}")
    lang = input("  Pick a language code (or press Enter to skip): ").strip().lower()

    if lang in GREETINGS:
        print(f"\n  {GREETINGS[lang].format(name=name)}")
    elif lang:
        print(f"\n  Language '{lang}' not found.")

    print("\n" + "=" * 50)
    print(rainbow_text("  Goodbye and have a great day!"))
    print("=" * 50 + "\n")


if __name__ == "__main__":
    if "--no-interactive" in sys.argv:
        print(ASCII_LOGO)
        print(f"  Hello, {os.environ.get("USER", os.environ.get("LOGNAME", "World"))}!")
        show_time()
        show_system_info()
        show_random_fact()
    else:
        interactive_greeting()
