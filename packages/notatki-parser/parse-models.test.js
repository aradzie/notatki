import { test } from "node:test";
import { like } from "rich-assert";
import { parseModelList } from "./parser.js";

test("parse whitespace", () => {
  like(parseModelList(""), []);
  like(parseModelList(" "), []);
  like(parseModelList("\t"), []);
  like(parseModelList(" \n"), []);
  like(parseModelList("\t\n"), []);
  like(parseModelList(" \n \n \n "), []);
  like(parseModelList("\t\n\t\n\t\n\t"), []);
});

test("parse models", () => {
  like(
    parseModelList(`
model Model 1
id 123
field Front
field Back
field Back Extra?
card Card 1
front
[front]
~~~
back
[back]
~~~
styles
[styles]
~~~
`),
    [
      {
        name: {
          text: "Model 1",
        },
        id: {
          id: {
            text: "123",
          },
          value: 123,
        },
        fields: [
          {
            name: {
              text: "Front",
            },
            required: true,
          },
          {
            name: {
              text: "Back",
            },
            required: true,
          },
          {
            name: {
              text: "Back Extra",
            },
            required: false,
          },
        ],
        cards: [
          {
            name: {
              text: "Card 1",
            },
            front: {
              text: "[front]",
            },
            back: {
              text: "[back]",
            },
          },
        ],
        styles: {
          text: "[styles]",
        },
      },
    ],
  );
});
