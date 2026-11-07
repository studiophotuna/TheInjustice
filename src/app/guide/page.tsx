import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "How to play · Conspira", description: "How Conspira works, from the Gutter to the top." };

export default function GuidePage() {
  return (
    <InfoPage kicker="Guide" title="How to play">
      <p className="lead">
        You were framed, jailed and let out with nothing. Conspira is about climbing back: work, learn, pick a side, and decide what
        kind of person you become on the way up. Here&apos;s how the city works.
      </p>

      <h2>Energy and work</h2>
      <p>
        Almost everything costs energy: jobs, training, crimes, fights. Energy refills over time, faster with a better place to
        sleep, and food tops it up. When you&apos;re out, come back later. The quick bar at the bottom works your usual job, trains,
        eats and patches you up with what you carry.
      </p>
      <p>
        Jobs are listed by district. Some are honest, some are <b>shady</b> (they pay dirty money and draw attention), and some are{" "}
        <b>risky</b> (they can go wrong and hurt you). Get good at the work you do and harder, better-paid work turns up that you
        didn&apos;t know about.
      </p>

      <h2>You never see your stats</h2>
      <p>
        Strength, nerve, wits and the rest are real, but hidden. You feel them instead: your Me page describes you in words, people
        react to you, and jobs get easier. Training at the gym and doing the work is how you grow. Nobody can see anyone&apos;s numbers,
        so size people up by who they are and what they do.
      </p>

      <h2>Careers</h2>
      <p>
        Pick a career to get off the street: Police, Courts, Medicine, Banking, Military, Mechanic, Hacker, Fire Department, or the
        street careers, Mafia and Vigilante. Schools want tuition, a clean record and an address; street careers find you. Each
        career has eight ranks. Work your career&apos;s jobs and grow the right qualities to get promoted, and each rank opens new work,
        new pay and new powers over other players. Specialties come with time, from everything you&apos;ve done.
      </p>
      <p>Leaving a career takes a while and costs you. Choose with care.</p>

      <h2>Money</h2>
      <p>
        Cash in your pocket can be lost: to a mugger, a fight or a hit. The bank keeps it safe and survives even death. Crimes pay{" "}
        <b>dirty money</b>, which shops and the bank won&apos;t take until it&apos;s laundered. Cities tax honest pay, and crews that run a
        district take protection money from outsiders.
      </p>

      <h2>Heat, the law and jail</h2>
      <p>
        Crime draws <b>heat</b>. The more you have, the more likely the police notice. Crimes leave witnesses and evidence, and
        detectives (real players) build cases. A case goes to trial, judged by a player judge, and can end in a fine, jail or
        prison. You can post bail, hire a lawyer, lie low in a safe house, or even break out, and then you&apos;re a fugitive. Heat
        cools off with time.
      </p>

      <h2>Fights, the clinic and death</h2>
      <p>
        You can fight people on the street and other players. Losing puts you in the clinic for a while. Picking a fight with someone
        far stronger than you can get you killed. Dying isn&apos;t the end: you start a new life, keep half of what you trained and your
        bank savings, but lose your cash, gear, home and career. A paid hit from a crew is softer: a stretch in the morgue and one
        rank lost.
      </p>

      <h2>Crews</h2>
      <p>
        Crews are Mafia families. They pool money in a vault, run districts as turf, go to war with other crews, run fronts, and can
        put contracts on people. Other careers can&apos;t join a crew but can be invited to a crew&apos;s secret forum.
      </p>

      <h2>Travel and the four countries</h2>
      <p>
        Varrow, Solmarra, Kestrova and Meridian each have their own laws, jobs, schools and dangers. Buses are cheap and get
        ambushed, trains have pickpockets, planes are fast and customs checks anyone with heat. Your career goes with you; street
        work stays where it is.
      </p>

      <h2>Home, cars and dogs</h2>
      <p>
        Rent or buy a place to live: it gives you an address, better rest and a stash. Cars get you around and can be stolen. Guard
        dogs and alarms protect your home from break-ins.
      </p>

      <h2>The city</h2>
      <p>
        Each city has a mayor (elected by players), a newspaper, a chat, player-run shops and businesses, and events like blackouts
        or heat waves that change the day for everyone. The regulars you meet on the street are the city&apos;s own people: some will
        work for you, some will remember what you did to them.
      </p>

      <h2>Favors</h2>
      <p>
        Favors buy looks: frames, name colours, banners, your own uploaded designs, and a microphone for Global chat. They never buy
        strength, money, protection or anything that wins.
      </p>
    </InfoPage>
  );
}
