import React from "react";
import { tr } from "../../i18n/strings";

export function WsLine(props: {
  uiLang: "en" | "ja"; // ★追加
  selected: boolean;
  active: boolean;
  title: string;
  subtitle: string;

  onClick: () => void;

  onOpen: (() => void) | null;
  onInsert: (() => void) | null;
  onEdit: (() => void) | null;
  onDuplicate: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const t = tr(props.uiLang);

  const border = props.selected ? "border-slate-500" : "border-slate-200";
  const bg = props.selected ? "bg-slate-50" : "bg-white";
  const activeMark = props.active ? "●" : " ";

  return (
    <div
      className={`flex items-center gap-2 border ${border} ${bg} px-2 py-2`}
      onClick={props.onClick}
    >
      <div
        className="w-[12px] text-[10px] text-slate-500"
        title={t("WORKSPACE_ACTIVE_TOOLTIP")}
      >
        {activeMark}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">
          {props.title}
        </div>
        {props.subtitle ? (
          <div className="truncate text-[11px] text-slate-500">
            {props.subtitle}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MiniBtn
          disabled={!props.onOpen}
          onClick={props.onOpen}
          title={t("OPEN")}
        >
          {t("OPEN")}
        </MiniBtn>

        <MiniBtn
          disabled={!props.onInsert}
          onClick={props.onInsert}
          title={t("INSERT_TO_MAIN")}
        >
          {t("INSERT")}
        </MiniBtn>

        <MiniBtn
          disabled={!props.onEdit}
          onClick={props.onEdit}
          title={t("EDIT")}
        >
          {t("EDIT")}
        </MiniBtn>

        <MiniBtn
          disabled={!props.onDuplicate}
          onClick={props.onDuplicate}
          title={t("DUPLICATE")}
        >
          {t("DUPLICATE")}
        </MiniBtn>

        <MiniBtn
          disabled={!props.onDelete}
          onClick={props.onDelete}
          title={t("DELETE")}
        >
          {t("DELETE")}
        </MiniBtn>
      </div>
    </div>
  );
}

function MiniBtn(props: {
  disabled?: boolean;
  onClick: (() => void) | null | undefined;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      className="h-[24px] border border-slate-300 bg-white px-2 text-[11px] hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40"
      disabled={props.disabled || !props.onClick}
      title={props.title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onClick?.();
      }}
    >
      {props.children}
    </button>
  );
}
