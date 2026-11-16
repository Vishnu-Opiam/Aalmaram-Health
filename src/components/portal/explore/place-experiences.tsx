"use client";

import { useUrlPanel } from "@/components/portal/sheet";
import type { Place } from "@/domain/trips/builder-view";
import { ExperienceCard } from "./cards";
import { ExperiencePanel } from "./experience-panel";
import { photoForExperience, type ExploreContext } from "./model";

/** A place's experiences as cards, each opening the same details panel as on Explore (`?item=`). */
export function PlaceExperiences({ place, context }: { place: Place; context: ExploreContext }) {
  const [itemId, openItem, closeItem] = useUrlPanel("item");
  const opened = place.experiences.find((e) => e.id === itemId) ?? null;
  return (
    <>
      <ul className="mt-6 space-y-6">
        {place.experiences.map((item, i) => (
          <ExperienceCard
            key={item.id}
            item={item}
            photo={photoForExperience(place, i)}
            days={context.inTrip.byComponent[item.id]}
            onOpen={() => openItem(item.id)}
            showPlace={false}
            row
          />
        ))}
      </ul>
      {opened && <ExperiencePanel item={opened} context={context} onClose={closeItem} />}
    </>
  );
}
