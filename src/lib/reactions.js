export const reactions = [
  {
    id: "hello",
    title: "Hey!",
    tags: "hello hi wave welcome",
    color: "#c4b5fd",
  },
  {
    id: "laugh",
    title: "LOL",
    tags: "laugh funny haha happy",
    color: "#fcd34d",
  },
  { id: "love", title: "Love it", tags: "love heart cute", color: "#f9a8d4" },
  { id: "wow", title: "Wow!", tags: "wow surprised amazing", color: "#7dd3fc" },
  {
    id: "dance",
    title: "Let's go",
    tags: "dance party celebrate yes",
    color: "#86efac",
  },
  {
    id: "thanks",
    title: "Thanks",
    tags: "thanks thank you grateful",
    color: "#fdba74",
  },
  {
    id: "vibe",
    title: "Same vibe",
    tags: "music vibe together agree",
    color: "#a5b4fc",
  },
  {
    id: "encore",
    title: "Encore!",
    tags: "again encore song repeat clap",
    color: "#f0abfc",
  },
];

export function getBuiltinGif(text) {
  const reaction = reactions.find((item) => text === `syncora:gif:${item.id}`);
  return reaction ? `/gifs/${reaction.id}.gif` : null;
}
