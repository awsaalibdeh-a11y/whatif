"""Three hand-written stories in the same line format the AI writes. They keep the site useful when the AI is switched off or has no key,
and they are what the tests parse. Facts in REAL / FACT lines are true; everything else is clearly speculation."""

TITANIC = """\
DEMO|The AI is resting, so here is a hand-written example. Ask again later for your own.
TITLE|The Ship That Made It
PREMISE|What if the Titanic never hit the iceberg?
REAL|The Titanic hit an iceberg on 14 April 1912 and sank on her first voyage, and more than 1,500 people died. The disaster led to the first international safety-at-sea treaty, which required lifeboats for everyone on board and radios that are listened to around the clock.
EVENT|April 1912|🚢|A triumph in New York|The Titanic docks on schedule and the voyage is celebrated as a triumph. Newspapers call her the safest ship ever built, and nobody asks how many lifeboats she carried.
EVENT|1913|⚓|Bigger ships, same old rules|Rival companies race to build even larger liners. Without a shocking disaster, the old rule that let ships carry lifeboats for only part of their passengers probably stays on the books for longer.
EVENT|1914|📡|Radio stays a bit optional|Many ships keep their radio rooms closed at night. The habit of listening for distress calls around the clock spreads slowly instead of becoming law almost overnight.
EVENT|1920s|🌊|Another ship learns the lesson|Sooner or later a big liner would probably meet serious trouble in the icy North Atlantic. The lesson still arrives, but years later and possibly at a similar human cost.
EVENT|1950s|🛳️|Safety catches up anyway|Rules tighten, pushed by later accidents and by competition from airplanes. The Titanic would be remembered as a famous liner, not a legend.
EVENT|Today|🎬|No haunted legend|Films, museums and wreck expeditions would look very different. She would be an old luxury liner from a long-gone age, perhaps scrapped decades ago.
CHAIN|Safe voyage > No shock > Slow rule changes > Later disaster > Safety anyway
WIN|Shipping companies avoid a huge loss and keep their reputation, at least for a while.
WIN|Anyone who was aboard that night, of course, and their families.
LOSE|Passengers on later ships who would sail under older rules for longer.
LOSE|Filmmakers and storytellers, who would have no famous disaster to retell.
SAME|Icebergs would still drift into the shipping lanes every spring.
SCORE|72|Many ships crossed safely, so a lucky escape is easy to believe, though the rules probably would have changed eventually.
FACT|Several ships warned of ice that day, but the Titanic kept going at nearly full speed.
BRANCH|What if the lifeboats had been enough for everyone?
BRANCH|What if the iceberg had been spotted a minute earlier?
BRANCH|What if airplanes had arrived ten years sooner?
"""

DINOSAURS = """\
DEMO|The AI is resting, so here is a hand-written example. Ask again later for your own.
TITLE|A Planet of Dinosaurs
PREMISE|What if the dinosaurs never went extinct?
REAL|About 66 million years ago an asteroid hit near what is now Mexico, and all the dinosaurs except the birds died out. Mammals then spread into the empty spaces and, much later, led to us.
EVENT|66 million years ago|☄️|The asteroid misses|The sky stays clear and the big reptiles keep their world. For the little furry mammals hiding in burrows, nothing changes.
EVENT|Next 30 million years|🐭|Mammals stay small|With the big roles already taken, mammals probably stay small and mostly come out at night. Giant plant-eaters keep shaping the forests by knocking trees over.
EVENT|20 million years ago|🌿|The grasslands look different|Huge herds of horned and armoured dinosaurs would graze where antelope and bison do today. Hunters evolve to match them, and the predators keep getting cleverer.
EVENT|5 million years ago|🐒|No ape family tree|Primates may never become common or clever without the great mammal boom. The branch that leads to humans could stay a tiny twig, or vanish.
EVENT|Today|🦖|Who runs the planet?|The world might be ruled by feathered, clever dinosaurs, or by no intelligent species at all. Either way, there would be no cities, no screens and nobody asking this question.
CHAIN|Asteroid misses > Dinosaurs stay big > Mammals stay small > Few primates > No humans
WIN|Dinosaurs, obviously, and plants that would have evolved alongside them.
WIN|Birds would probably be even more varied than the ones we know.
LOSE|Mammals, who would stay in the shadows for a much longer time.
LOSE|Humans, who might never exist at all.
SAME|The continents would still drift and the climate would still change slowly over millions of years.
SCORE|40|Scientists agree mammals needed the extinction to spread, but how far dinosaurs would have evolved is anyone's guess.
FACT|Birds are living dinosaurs, so a chicken is a descendant of the dinosaurs that survived the asteroid.
BRANCH|What if mammals had been the ones that died out?
BRANCH|What if the asteroid had hit the other side of the Earth?
BRANCH|What if humans lived alongside dinosaurs?
"""

MOON = """\
DEMO|The AI is resting, so here is a hand-written example. Ask again later for your own.
TITLE|Earth Without a Moon
PREMISE|What if the Moon never existed?
REAL|The Moon formed about 4.5 billion years ago, most likely when a Mars-sized object hit the young Earth. Its gravity makes our ocean tides and helps keep Earth's tilt steady, which keeps the seasons fairly mild.
EVENT|4.5 billion years ago|🌍|A lonely young Earth|There is no giant impact, so the Earth is left to spin without a partner. The planet is still hot, rocky and covered in storms.
EVENT|Early oceans|🌊|Tides shrink to a whisper|Only the Sun would pull on the oceans, so tides would be far weaker. Some scientists think tidal pools helped early life, so that idea would have to be replaced by others.
EVENT|Millions of years|🌀|A wobbling planet|Without the Moon holding it steady, Earth's tilt could drift over very long periods. That might cause big swings in climate, though scientists still debate how big.
EVENT|Ages of evolution|🦉|Darker nights|Moonlight is faint, but animals evolved around it. Hunters, prey and even the timing of coral spawning would work differently under pure starlight.
EVENT|Human history|🗓️|Calendars and legends change|The word month comes from the Moon. Calendars, festivals and countless myths would be built around the Sun and stars instead.
EVENT|Today|🚀|A different space race|There is no Apollo, no footprints and no first small step. Humans would aim straight for Mars or the planets, if they could get there at all.
CHAIN|No Moon > Weak tides > Unsteady tilt > Odd climate > Different life
WIN|Stargazers, who would enjoy truly dark skies every night of the month.
WIN|Anyone who dislikes full-moon sleeplessness.
LOSE|Coastal animals that time their lives by the tides.
LOSE|Space fans, who would lose the closest and easiest world to visit.
SAME|The Sun would still rise every morning and the seasons would still exist.
SCORE|55|Scientists agree the Moon matters a lot, but how much stability it gives is still argued about.
FACT|The Moon is moving away from Earth by about 3.8 centimetres every year.
BRANCH|What if Earth had two moons?
BRANCH|What if the Moon was twice as close?
BRANCH|What if the Earth had no tilt?
"""

ALL = {"titanic": TITANIC, "dinosaurs": DINOSAURS, "moon": MOON}
KEYWORDS = (("titanic", ("titanic", "ship", "iceberg", "boat", "ocean", "sea")), ("dinosaurs", ("dino", "extinct", "animal", "asteroid", "nature")),
            ("moon", ("moon", "space", "planet", "earth", "sun", "gravity")))


def pick(premise):
    """The sample that fits the question best; otherwise one that depends on the text, so the demo is not always the same."""
    t = (premise or "").lower()
    for key, words in KEYWORDS:
        if any(w in t for w in words):
            return ALL[key]
    keys = sorted(ALL)
    return ALL[keys[sum(map(ord, t)) % len(keys)]]
