import random
secret_number = random.randint(1, 1000)

def secret_number_loop(guess, tries):
    if guess == secret_number:
        print("You have guessed the correct number and it took you", tries, "tries!")
        return True
    elif guess < secret_number:
        print("You have guessed too low")
    else:
        print("You have guessed too high")
    return False

def game():
    print("Welcome to the number guessing game!")
    guess = None
    tries = 0
    while guess != secret_number:
        guess = int(input("Guess the number between 1-100:"))
        tries += 1
        if secret_number_loop(guess, tries):
            break

def main():
    while True:
        answer = input("Do you want to play the guessing game?").strip().lower()
        if answer == "yes":
            game()
        elif answer == "no":
            print("Oh no, what a bummer!")
            break
        else:
            print("please answer with yes or no")
main()
