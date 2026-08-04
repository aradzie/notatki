import * as cn from "./Toolbar.module.css";
import { useView } from "./view.tsx";

export function Toolbar() {
  const { view, setView } = useView();
  return (
    <div className={cn.root}>
      <span>
        View:{" "}
        <Button
          text={"Compact"}
          onClick={() => {
            setView({ ...view, view: "compact" });
          }}
        />
        {" | "}
        <Button
          text={"Details"}
          onClick={() => {
            setView({ ...view, view: "details" });
          }}
        />
      </span>{" "}
      <span>
        Align:{" "}
        <Button
          text={"Left"}
          onClick={() => {
            setView({ ...view, align: "left" });
          }}
        />
        {" | "}
        <Button
          text={"Center"}
          onClick={() => {
            setView({ ...view, align: "center" });
          }}
        />
        {" | "}
        <Button
          text={"Full Width"}
          onClick={() => {
            setView({ ...view, align: "width" });
          }}
        />
      </span>
    </div>
  );
}

function Button({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <a
      href={"#"}
      onClick={(ev) => {
        ev.preventDefault();
        onClick();
      }}
    >
      {text}
    </a>
  );
}
