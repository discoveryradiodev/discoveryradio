"use client";

import { useEffect, useRef } from "react";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import { KIND_FIELD_DEFAULTS } from "@/lib/dev/style-lab-defaults";
import { STYLE_LAB_FONT_OPTIONS } from "@/lib/dev/style-lab-fonts";
import {
  STYLE_TARGET_REGISTRY,
  TARGET_TO_GROUP,
  TARGET_TO_KIND,
  type StyleTargetId,
} from "@/lib/dev/style-lab-inspect";
import {
  ColorControl,
  RangeControl,
  SelectControl,
} from "./controls";
import styles from "./styleLab.module.css";

interface ControlPanelProps {
  activeTarget: string;
  activeStyleTarget: StyleTargetId;
  onClose: () => void;
  onReset: () => void;
}

export function ControlPanel({
  activeTarget,
  activeStyleTarget,
  onClose,
  onReset,
}: ControlPanelProps) {
  const { updateTargetVariable, getTargetValue } = useStyleLab();
  const spotlightGroupRef = useRef<HTMLDivElement>(null);
  const articleGroupRef = useRef<HTMLDivElement>(null);
  const blogGroupRef = useRef<HTMLDivElement>(null);
  const controlGroupsRef = useRef<HTMLDivElement>(null);
  const activeGroup = TARGET_TO_GROUP[activeStyleTarget];
  const activeKind = TARGET_TO_KIND[activeStyleTarget];

  // Jump to active style target group
  useEffect(() => {
    if (!controlGroupsRef.current) return;

    const groupType = activeGroup;
    let targetRef: React.RefObject<HTMLDivElement> | null = null;

    if (groupType === "spotlight") targetRef = spotlightGroupRef;
    else if (groupType === "article") targetRef = articleGroupRef;
    else if (groupType === "blog") targetRef = blogGroupRef;

    if (targetRef?.current) {
      const groupsContainer = controlGroupsRef.current;
      const targetElement = targetRef.current;
      const offset = targetElement.offsetTop - groupsContainer.offsetTop;
      const containerHeight = groupsContainer.clientHeight;
      const elementHeight = targetElement.clientHeight;

      // Scroll to make the group visible
      if (offset < groupsContainer.scrollTop) {
        groupsContainer.scrollTop = offset;
      } else if (offset + elementHeight > groupsContainer.scrollTop + containerHeight) {
        groupsContainer.scrollTop = offset + elementHeight - containerHeight;
      }
    }
  }, [activeGroup]);

  /** Returns the current user-set value for a field, falling back to the kind's default. */
  const getTargetVarValue = (field: string): string =>
    getTargetValue(activeStyleTarget, field) ??
    (KIND_FIELD_DEFAULTS[activeKind as keyof typeof KIND_FIELD_DEFAULTS] as Record<string, string>)[field] ??
    "";

  /** Writes a field value for the currently active target. */
  const updateTargetField = (field: string, val: string) =>
    updateTargetVariable(activeStyleTarget, field, val);

  const groupInPreview =
    (activeTarget === "feed-homepage" && [
      "feedShell",
      "spotlight",
      "profile",
      "homepageBlog",
      "playlist",
      "archivePreview",
      "socials",
      "discord",
    ].includes(activeGroup)) ||
    (activeTarget === "live-spotlight" && activeGroup === "article") ||
    (activeTarget === "live-blog" && activeGroup === "blog");

  const fontOptions = STYLE_LAB_FONT_OPTIONS;

  const showTextControls = activeKind === "text";
  const showImageControls = activeKind === "image";
  const showButtonControls = activeKind === "button";
  const showContainerControls = activeKind === "container";
  const showContainerLayoutControls = [
    "article-content-frame",
    "article-hero",
    "article-image-wrap",
    "spotlight-header",
    "blog-content-frame",
  ].includes(activeStyleTarget);

  return (
    <div className={styles.controlPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderTop}>
          <h2 className={styles.panelTitle}>Style Lab Controls</h2>
          <button onClick={onClose} className={styles.closeButton} title="Close contextual editor">
            Close
          </button>
        </div>
        <p className={styles.panelSubtitle}>
          Selected: {STYLE_TARGET_REGISTRY[activeStyleTarget].label} ({activeKind})
        </p>
      </div>

      <div ref={controlGroupsRef} className={styles.controlGroups}>
        {groupInPreview ? (
          <div
            ref={
              activeGroup === "spotlight"
                ? spotlightGroupRef
                : activeGroup === "article"
                  ? articleGroupRef
                  : activeGroup === "blog"
                    ? blogGroupRef
                    : undefined
            }
            className={`${styles.controlGroup} ${styles.controlGroupActive}`}
          >
            <div className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>{formatGroupLabel(activeGroup)}</h3>
            </div>

            <div className={styles.controlsContainer}>
              {showTextControls ? (
                <>
                  <SelectControl
                    label="Font Family"
                    value={getTargetVarValue("font-family")}
                    onChange={(val) => updateTargetField("font-family", val)}
                    options={fontOptions}
                  />
                  <RangeControl
                    label="Font Size"
                    value={getTargetVarValue("font-size")}
                    onChange={(val) => updateTargetField("font-size", val)}
                    min="0.7"
                    max="4"
                    step="0.05"
                    unit="rem"
                  />
                  <RangeControl
                    label="Font Weight"
                    value={getTargetVarValue("font-weight")}
                    onChange={(val) => updateTargetField("font-weight", val)}
                    min="100"
                    max="900"
                    step="100"
                  />
                  <RangeControl
                    label="Line Height"
                    value={getTargetVarValue("line-height")}
                    onChange={(val) => updateTargetField("line-height", val)}
                    min="1"
                    max="2.5"
                    step="0.05"
                  />
                  <RangeControl
                    label="Letter Spacing"
                    value={getTargetVarValue("letter-spacing")}
                    onChange={(val) => updateTargetField("letter-spacing", val)}
                    min="-0.2"
                    max="0.3"
                    step="0.01"
                    unit="em"
                  />
                  <SelectControl
                    label="Text Transform"
                    value={getTargetVarValue("text-transform")}
                    onChange={(val) => updateTargetField("text-transform", val)}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Uppercase", value: "uppercase" },
                      { label: "Lowercase", value: "lowercase" },
                      { label: "Capitalize", value: "capitalize" },
                    ]}
                  />
                  <ColorControl
                    label="Text Color"
                    value={getTargetVarValue("color")}
                    onChange={(val) => updateTargetField("color", val)}
                  />
                  <SelectControl
                    label="Text Align"
                    value={getTargetVarValue("text-align")}
                    onChange={(val) => updateTargetField("text-align", val)}
                    options={[
                      { label: "Left", value: "left" },
                      { label: "Center", value: "center" },
                      { label: "Right", value: "right" },
                      { label: "Justify", value: "justify" },
                    ]}
                  />
                </>
              ) : null}

              {showImageControls ? (
                <>
                  <RangeControl
                    label="Width"
                    value={getTargetVarValue("width")}
                    onChange={(val) => updateTargetField("width", val)}
                    min="10"
                    max="200"
                    step="1"
                    unit="%"
                  />
                  <RangeControl
                    label="Max Width"
                    value={getTargetVarValue("max-width")}
                    onChange={(val) => updateTargetField("max-width", val)}
                    min="100"
                    max="1400"
                    step="10"
                    unit="px"
                  />
                  <RangeControl
                    label="Opacity"
                    value={getTargetVarValue("opacity")}
                    onChange={(val) => updateTargetField("opacity", val)}
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <RangeControl
                    label="Border Radius"
                    value={getTargetVarValue("border-radius")}
                    onChange={(val) => updateTargetField("border-radius", val)}
                    min="0"
                    max="100"
                    step="1"
                    unit="px"
                  />
                  <RangeControl
                    label="Border Width"
                    value={getTargetVarValue("border-width")}
                    onChange={(val) => updateTargetField("border-width", val)}
                    min="0"
                    max="12"
                    step="1"
                    unit="px"
                  />
                  <ColorControl
                    label="Border Color"
                    value={getTargetVarValue("border-color")}
                    onChange={(val) => updateTargetField("border-color", val)}
                  />
                  <SelectControl
                    label="Box Shadow"
                    value={getTargetVarValue("box-shadow")}
                    onChange={(val) => updateTargetField("box-shadow", val)}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Soft", value: "0 8px 24px rgba(15, 23, 42, 0.3)" },
                      { label: "Hard", value: "0 8px 0 rgba(15, 23, 42, 0.45)" },
                    ]}
                  />
                  <RangeControl
                    label="X Offset"
                    value={getTargetVarValue("x-offset")}
                    onChange={(val) => updateTargetField("x-offset", val)}
                    min="-200"
                    max="200"
                    step="1"
                    unit="px"
                  />
                  <RangeControl
                    label="Y Offset"
                    value={getTargetVarValue("y-offset")}
                    onChange={(val) => updateTargetField("y-offset", val)}
                    min="-200"
                    max="200"
                    step="1"
                    unit="px"
                  />
                  <RangeControl
                    label="Rotation"
                    value={getTargetVarValue("rotation")}
                    onChange={(val) => updateTargetField("rotation", val)}
                    min="-25"
                    max="25"
                    step="1"
                    unit="deg"
                  />
                </>
              ) : null}

              {showButtonControls ? (
                <>
                  <SelectControl
                    label="Font Family"
                    value={getTargetVarValue("font-family")}
                    onChange={(val) => updateTargetField("font-family", val)}
                    options={fontOptions}
                  />
                  <RangeControl
                    label="Font Size"
                    value={getTargetVarValue("font-size")}
                    onChange={(val) => updateTargetField("font-size", val)}
                    min="0.7"
                    max="2"
                    step="0.05"
                    unit="rem"
                  />
                  <RangeControl
                    label="Font Weight"
                    value={getTargetVarValue("font-weight")}
                    onChange={(val) => updateTargetField("font-weight", val)}
                    min="100"
                    max="900"
                    step="100"
                  />
                  <ColorControl
                    label="Text Color"
                    value={getTargetVarValue("text-color")}
                    onChange={(val) => updateTargetField("text-color", val)}
                  />
                  <ColorControl
                    label="Background"
                    value={getTargetVarValue("background-color")}
                    onChange={(val) => updateTargetField("background-color", val)}
                  />
                  <RangeControl
                    label="Border Width"
                    value={getTargetVarValue("border-width")}
                    onChange={(val) => updateTargetField("border-width", val)}
                    min="0"
                    max="12"
                    step="1"
                    unit="px"
                  />
                  <ColorControl
                    label="Border Color"
                    value={getTargetVarValue("border-color")}
                    onChange={(val) => updateTargetField("border-color", val)}
                  />
                  <RangeControl
                    label="Border Radius"
                    value={getTargetVarValue("border-radius")}
                    onChange={(val) => updateTargetField("border-radius", val)}
                    min="0"
                    max="40"
                    step="1"
                    unit="px"
                  />
                  <RangeControl
                    label="Padding X"
                    value={getTargetVarValue("padding-x")}
                    onChange={(val) => updateTargetField("padding-x", val)}
                    min="0"
                    max="60"
                    step="1"
                    unit="px"
                  />
                  <RangeControl
                    label="Padding Y"
                    value={getTargetVarValue("padding-y")}
                    onChange={(val) => updateTargetField("padding-y", val)}
                    min="0"
                    max="40"
                    step="1"
                    unit="px"
                  />
                  <SelectControl
                    label="Box Shadow"
                    value={getTargetVarValue("box-shadow")}
                    onChange={(val) => updateTargetField("box-shadow", val)}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Soft", value: "0 4px 12px rgba(15, 23, 42, 0.25)" },
                      { label: "Hard", value: "4px 4px 0 rgba(15, 23, 42, 0.4)" },
                    ]}
                  />
                </>
              ) : null}

              {showContainerControls ? (
                <>
                  <ColorControl
                    label="Background"
                    value={getTargetVarValue("background-color")}
                    onChange={(val) => updateTargetField("background-color", val)}
                  />
                  <RangeControl
                    label="Border Width"
                    value={getTargetVarValue("border-width")}
                    onChange={(val) => updateTargetField("border-width", val)}
                    min="0"
                    max="12"
                    step="1"
                    unit="px"
                  />
                  <ColorControl
                    label="Border Color"
                    value={getTargetVarValue("border-color")}
                    onChange={(val) => updateTargetField("border-color", val)}
                  />
                  <RangeControl
                    label="Border Radius"
                    value={getTargetVarValue("border-radius")}
                    onChange={(val) => updateTargetField("border-radius", val)}
                    min="0"
                    max="50"
                    step="1"
                    unit="px"
                  />
                  {showContainerLayoutControls ? (
                    <>
                      <RangeControl
                        label="Content Max Width"
                        value={getTargetVarValue("max-width")}
                        onChange={(val) => updateTargetField("max-width", val)}
                        min="320"
                        max="1400"
                        step="10"
                        unit="px"
                      />
                      <SelectControl
                        label="Horizontal Alignment"
                        value={getTargetVarValue("margin-x-mode")}
                        onChange={(val) => updateTargetField("margin-x-mode", val)}
                        options={[
                          { label: "None", value: "none" },
                          { label: "Center", value: "auto" },
                        ]}
                      />
                      {getTargetVarValue("margin-x-mode") === "none" ? (
                        <RangeControl
                          label="Horizontal Margin"
                          value={getTargetVarValue("margin-x")}
                          onChange={(val) => updateTargetField("margin-x", val)}
                          min="0"
                          max="240"
                          step="2"
                          unit="px"
                        />
                      ) : null}
                      <RangeControl
                        label="Padding Left/Right"
                        value={getTargetVarValue("padding-x")}
                        onChange={(val) => updateTargetField("padding-x", val)}
                        min="0"
                        max="160"
                        step="2"
                        unit="px"
                      />
                      <RangeControl
                        label="Padding Top/Bottom"
                        value={getTargetVarValue("padding-y")}
                        onChange={(val) => updateTargetField("padding-y", val)}
                        min="0"
                        max="160"
                        step="2"
                        unit="px"
                      />
                    </>
                  ) : null}
                  <RangeControl
                    label="Padding"
                    value={getTargetVarValue("padding")}
                    onChange={(val) => updateTargetField("padding", val)}
                    min="0"
                    max="60"
                    step="1"
                    unit="px"
                  />
                  <SelectControl
                    label="Shadow"
                    value={getTargetVarValue("shadow")}
                    onChange={(val) => updateTargetField("shadow", val)}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Soft", value: "0 8px 24px rgba(15, 23, 42, 0.25)" },
                      { label: "Hard", value: "6px 6px 0 rgba(15, 23, 42, 0.35)" },
                    ]}
                  />
                  <RangeControl
                    label="Opacity"
                    value={getTargetVarValue("opacity")}
                    onChange={(val) => updateTargetField("opacity", val)}
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.controlGroup}>
            <p className={styles.footerNote}>Select a matching target in this preview to edit it.</p>
          </div>
        )}
      </div>

      <div className={styles.panelFooter}>
        <button
          onClick={onReset}
          className={styles.resetButton}
        >
          Reset to Defaults
        </button>
        <p className={styles.footerNote}>
          Changes saved to localStorage automatically.
        </p>
      </div>
    </div>
  );
}

function formatTargetLabel(targetId: StyleTargetId): string {
  return targetId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    feedShell: "Feed Shell",
    spotlight: "Spotlight",
    profile: "Artist Profile",
    homepageBlog: "Homepage Blog",
    playlist: "Playlist",
    archivePreview: "Archive Preview",
    socials: "Socials",
    discord: "Discord",
    article: "Live Spotlight Article",
    blog: "Live Blog",
  };
  return labels[group] ?? formatTargetLabel(group as StyleTargetId);
}
