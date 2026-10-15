"""Hand-picked "what if" starters. Shown as ideas on the home page, used for Surprise me, and one of them is the Daily what-if."""

import datetime

CATEGORIES = (
    ("history", "History"), ("science", "Science"), ("tech", "Tech"), ("culture", "Culture"), ("nature", "Nature"), ("life", "Your life"),
)

PREMISES = [
    ("history", "What if the Titanic never hit the iceberg?"),
    ("history", "What if the Library of Alexandria was never destroyed?"),
    ("history", "What if the printing press was never invented?"),
    ("history", "What if Rome never fell?"),
    ("history", "What if the Black Death never happened?"),
    ("history", "What if Columbus never sailed west?"),
    ("history", "What if the Wright brothers had failed?"),
    ("history", "What if the Apollo 11 landing had failed?"),
    ("history", "What if the Romans had discovered steam power?"),
    ("history", "What if the Berlin Wall had never fallen?"),
    ("history", "What if Tesla's wireless power had worked?"),
    ("history", "What if Egypt had never built the pyramids?"),
    ("science", "What if the Moon never existed?"),
    ("science", "What if the dinosaurs never went extinct?"),
    ("science", "What if gravity were half as strong?"),
    ("science", "What if the Earth stopped spinning?"),
    ("science", "What if the Sun vanished for ten minutes?"),
    ("science", "What if humans could photosynthesize?"),
    ("science", "What if the Earth had no tilt?"),
    ("science", "What if antibiotics were never discovered?"),
    ("science", "What if the speed of light were much slower?"),
    ("science", "What if Earth had rings like Saturn?"),
    ("science", "What if we found alien life next year?"),
    ("science", "What if the whole planet froze over again?"),
    ("tech", "What if the internet had never been invented?"),
    ("tech", "What if smartphones were banned worldwide?"),
    ("tech", "What if electricity had never been harnessed?"),
    ("tech", "What if cars could fly?"),
    ("tech", "What if everyone had a home robot in 1990?"),
    ("tech", "What if the telephone was never invented?"),
    ("tech", "What if computers had stayed the size of rooms?"),
    ("tech", "What if AI had arrived in 1970?"),
    ("tech", "What if nobody ever invented the wheel?"),
    ("tech", "What if social media never existed?"),
    ("tech", "What if all fossil fuels vanished tomorrow?"),
    ("tech", "What if video games had been invented in the 1800s?"),
    ("culture", "What if The Beatles never formed?"),
    ("culture", "What if Minecraft had never been made?"),
    ("culture", "What if movies had never gained sound?"),
    ("culture", "What if football had never been invented?"),
    ("culture", "What if pizza had never been invented?"),
    ("culture", "What if chocolate had never left South America?"),
    ("culture", "What if the modern Olympics had never started?"),
    ("culture", "What if everyone in the world spoke one language?"),
    ("culture", "What if Pokemon had never become popular?"),
    ("culture", "What if Shakespeare had never written a play?"),
    ("culture", "What if tomatoes had never reached Italy?"),
    ("culture", "What if comic books had never been invented?"),
    ("nature", "What if bees disappeared overnight?"),
    ("nature", "What if the oceans rose by 20 metres?"),
    ("nature", "What if cats were as big as lions?"),
    ("nature", "What if mosquitoes went extinct?"),
    ("nature", "What if the Amazon rainforest vanished?"),
    ("nature", "What if there were no seasons?"),
    ("nature", "What if the Sahara turned green again?"),
    ("nature", "What if humans had evolved wings?"),
    ("nature", "What if trees could walk?"),
    ("nature", "What if whales had never gone back to the sea?"),
    ("life", "What if everyone only needed four hours of sleep?"),
    ("life", "What if school started at noon?"),
    ("life", "What if you could pause time for one hour a day?"),
    ("life", "What if you had learned a second language as a baby?"),
    ("life", "What if you could talk to animals?"),
    ("life", "What if homework was banned?"),
    ("life", "What if the school week was only three days?"),
    ("life", "What if you woke up with a new superpower tomorrow?"),
    ("life", "What if money didn't exist?"),
    ("life", "What if you were famous for one day?"),
]


def as_list():
    return [{"c": c, "t": t} for c, t in PREMISES]


def daily(day=None):
    """Same premise for everybody on the same date."""
    day = day or datetime.date.today()
    c, t = PREMISES[(day.toordinal() * 7) % len(PREMISES)]
    return {"c": c, "t": t, "date": day.isoformat()}
