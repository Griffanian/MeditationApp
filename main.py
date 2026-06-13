import json
from pathlib import Path

from dotenv import load_dotenv

from generate_script import generate_script
from synthesize import generate_components, assemble

load_dotenv()


def main():
    technique_file = Path("Kapalbhati.md")
    output_dir = Path("output")
    components_dir = output_dir / "components"
    output_dir.mkdir(exist_ok=True)

    config = {
        "duration_minutes": 5,
        "rounds": 3,
        "tone": "calm and grounding",
    }

    # Step 1: Generate the script
    print("Generating meditation script...")
    technique_text = technique_file.read_text()
    script = generate_script(technique_text, config)

    # Save the script for reference
    script_path = output_dir / "kapalbhati_script.json"
    script_path.write_text(json.dumps(script, indent=2))
    print(f"Script saved to {script_path}")

    # Step 2: Generate speech components (skips cached clips)
    print("\nGenerating speech components...")
    generate_components(script, components_dir)

    # Step 3: Assemble (no API calls, purely local)
    print("\nAssembling audio...")
    audio = assemble(script, components_dir)

    # Step 4: Export
    output_path = output_dir / "kapalbhati.mp3"
    audio.export(str(output_path), format="mp3", bitrate="192k")
    print(f"\nDone! Output saved to {output_path}")
    print(f"Duration: {len(audio) / 1000:.1f}s")


if __name__ == "__main__":
    main()
