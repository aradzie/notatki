Start = "" { return null; }

// Note file parser
// ----------------

NoteList =
  list:( ( _ Newline )* @Note )* ( _ Newline )* _
  { return list; }

Note =
  properties:( ( _ Newline )* @NoteProperty _ Newline )*
  fields:( ( _ Newline )* @NoteField _ Newline )*
  end:( ( _ Newline )* @NoteEnd _ Newline )
  { return { properties, fields, end, loc: location() }; }

NoteProperty "property" =
  name:NotePropertyName _ value:NormalText
  { return { name, value, loc: location() }; }

NotePropertyName =
  text:(
    "!type:"i { return "type"; }
  / "!deck:"i { return "deck"; }
  / "!tags:"i { return "tags"; }
  )
  { return { text, loc: location() }; }

NoteField "field" =
  name:NoteFieldName _ value:NoteFieldValue
  { return { name, value, loc: location() }; }

NoteFieldName =
  "!" text:FieldNameText ":"
  { return { text, loc: location() }; }

NoteFieldValue =
  text:(
    head:( @Text _ )
    lines:( !( Newline ( NoteFieldName / NoteEnd / !. ) ) Newline @Text _ )*
    { return [head, ...lines].join("\n").trim(); }
  )
  { return { text, loc: location() }; }

NoteEnd =
  text:"~~~"
  { return { text, loc: location() }; }

// Model file parser
// -----------------

ModelList =
  list:( ( _ Newline )* @Model )* ( _ Newline )* _
  { return list; }

Model =
  "model" Whitespace name:NormalText _ Newline
  id:( ( _ Newline )* @ModelId _ Newline )
  cloze:( ( _ Newline )* @ModelCloze _ Newline )?
  fields:( ( _ Newline )* @ModelField _ Newline )*
  cards:( ( _ Newline )* @ModelCard )*
  styles:( ( _ Newline )* @ModelStyles _ Newline )?
  { return { name, id, cloze, fields, cards, styles, loc: location() } }

ModelId =
  "id" Whitespace id:( text:$[0-9]+ { return { text, loc: location() }; } )
  { return { id, value: Number.parseInt(id.text), loc: location() }; }

ModelCloze =
  text:"cloze"
  { return { text, loc: location() }; }

ModelField =
  "field" Whitespace name:ModelFieldName _ opt:"?"?
  { return { name, required: !opt, loc: location() } }

ModelFieldName =
  text:FieldNameText
  { return { text, loc: location() }; }

ModelCard =
  "card" Whitespace name:NormalText _ Newline
  front:( ( _ Newline )* @ModelCardFront _ Newline )
  back:( ( _ Newline )* @ModelCardBack _ Newline )
  { return { name, front, back, loc: location() } }

ModelCardFront =
  "front" _ Newline
  text:MultilineText
  { return { text, loc: location() } }

ModelCardBack =
  "back" _ Newline
  text:MultilineText
  { return { text, loc: location() } }

ModelStyles =
  "styles" _ Newline
  text:MultilineText
  { return { text, loc: location() } }

MultilineText =
  lines:( !( "~~~" ) @Text _ Newline )*
  "~~~"
  { return lines.join("\n").trim(); }

// Card template parser
// --------------------

Template = ( TemplateText / TemplateBranch / TemplateField )*

TemplateText =
  text:$( !( "{{" ) . )+
  { return { type: "text", text, loc: location() }; }

TemplateBranch =
  cond:( IfField / IfNotField ) items:Template end:EndIfField
  {
    if (cond.field.text !== end.field.text) {
       error(`Expected "${cond.field.text}" but got "${end.field.text}".`, end.field.loc);
    }
    return { type: "branch", cond, items, end, loc: location() };
  }

TemplateField =
  "{{" _  !( "#" / "^" / "/" ) field:TemplateFieldName _ "}}"
  { return { type: "field", field, loc: location() }; }

IfField =
  "{{" _ "#" _ field:TemplateFieldName _ "}}"
  { return { field, not: false, loc: location() }; }

IfNotField =
  "{{" _ "^" _ field:TemplateFieldName _ "}}"
  { return { field, not: true,  loc: location() }; }

EndIfField =
  "{{" _  "/" _ field:TemplateFieldName _ "}}"
  { return { field, loc: location() }; }

TemplateFieldName =
  text:$( !( _ "}}" ) . )+
  { return { text: text.replaceAll(/\s+/g, " "), loc: location() }; }

// Shared rules
// ------------

NormalText =
  text:Text
  { return { text: text.replaceAll(/\s+/g, " "), loc: location() }; }

FieldNameText =
  part:( $[-_a-z0-9]i+ )|1.., Whitespace|
  { return part.join(" "); }

Text "text" =
  $( !( _ Newline ) . )*

Newline "newline" =
  $( "\r\n" / "\n" )

Whitespace "whitespace" =
  $[ \t]+

_ "whitespace" =
  $[ \t]*
