#!/bin/bash
# Compute session cost from transcript JSONL.
# Usage: compute-cost.sh <transcript_path> <model> [state_file]
# Outputs: JSON with token counts and cost in USD.
#
# If <state_file> is provided, parsing is incremental: only bytes past the
# previously recorded offset are scanned, cumulative token counts are loaded
# from and persisted back to the state file, and parsing never reads past the
# last '\n' (partial in-flight lines are left for the next invocation).
# Without <state_file> the transcript is re-parsed in full — this is the
# authoritative mode used by the Stop hook.

set -euo pipefail

TRANSCRIPT="$1"
MODEL="${2:-unknown}"
STATE_FILE="${3:-}"

debug() {
    [ "${DEBUG:-0}" = "1" ] && echo "[compute-cost] $*" >&2 || true
}

if [ ! -f "$TRANSCRIPT" ]; then
    echo '{"tokens":0,"cost_usd":0,"input":0,"output":0,"cache_read":0,"cache_create":0}'
    exit 0
fi

# Pricing per million tokens (USD). The cache-creation rate is 1.25× input.
case "$MODEL" in
    *opus*)
        INPUT_RATE="5.00"; OUTPUT_RATE="25.00"; CACHE_READ_RATE="0.50"; CACHE_CREATE_RATE="6.25" ;;
    *haiku*)
        INPUT_RATE="1.00"; OUTPUT_RATE="5.00"; CACHE_READ_RATE="0.10"; CACHE_CREATE_RATE="1.25" ;;
    *) # sonnet and others
        INPUT_RATE="3.00"; OUTPUT_RATE="15.00"; CACHE_READ_RATE="0.30"; CACHE_CREATE_RATE="3.75" ;;
esac

# Sum (input, cache_create, cache_read, output) token totals from a file.
sum_usage() {
    local src="$1"
    grep -o '"usage":{[^}]*"output_tokens":[0-9]*' "$src" 2>/dev/null | \
        sed 's/.*"input_tokens":\([0-9]*\).*"cache_creation_input_tokens":\([0-9]*\).*"cache_read_input_tokens":\([0-9]*\).*"output_tokens":\([0-9]*\).*/\1 \2 \3 \4/' | \
        awk '{input+=$1; cc+=$2; cr+=$3; out+=$4} END {printf "%d %d %d %d\n", input+0, cc+0, cr+0, out+0}'
}

if [ -n "$STATE_FILE" ]; then
    OFFSET=0; INPUT=0; CACHE_CREATE=0; CACHE_READ=0; OUTPUT=0
    if [ -f "$STATE_FILE" ]; then
        if STATE=$(jq -r '[.offset//0, .input//0, .cache_create//0, .cache_read//0, .output//0] | @tsv' "$STATE_FILE" 2>/dev/null); then
            read -r OFFSET INPUT CACHE_CREATE CACHE_READ OUTPUT <<<"$STATE"
        else
            debug "state file $STATE_FILE unreadable, resetting"
        fi
    fi

    FILE_SIZE=$(stat -c%s "$TRANSCRIPT" 2>/dev/null || echo 0)
    # If the transcript shrank (rotation/rewrite), restart from zero.
    if [ "$OFFSET" -gt "$FILE_SIZE" ]; then
        debug "offset $OFFSET > size $FILE_SIZE, resetting"
        OFFSET=0; INPUT=0; CACHE_CREATE=0; CACHE_READ=0; OUTPUT=0
    fi

    if [ "$OFFSET" -lt "$FILE_SIZE" ]; then
        TMP=$(mktemp)
        TMP_C="$TMP.c"
        trap 'rm -f "$TMP" "$TMP_C"' EXIT

        tail -c +"$((OFFSET + 1))" "$TRANSCRIPT" > "$TMP" 2>/dev/null || true
        # Keep only complete lines (those terminated by '\n'). `wc -l` counts
        # newline chars, so it naturally excludes any trailing partial line.
        NUM_LINES=$(wc -l < "$TMP" 2>/dev/null || echo 0)
        if [ "$NUM_LINES" -gt 0 ]; then
            head -n "$NUM_LINES" "$TMP" > "$TMP_C"
            COMPLETE_SIZE=$(stat -c%s "$TMP_C" 2>/dev/null || echo 0)

            read -r D_IN D_CC D_CR D_OUT <<<"$(sum_usage "$TMP_C")"
            INPUT=$((INPUT + D_IN))
            CACHE_CREATE=$((CACHE_CREATE + D_CC))
            CACHE_READ=$((CACHE_READ + D_CR))
            OUTPUT=$((OUTPUT + D_OUT))
            OFFSET=$((OFFSET + COMPLETE_SIZE))

            if [ "${DEBUG:-0}" = "1" ]; then
                while IFS= read -r line; do
                    [ -z "$line" ] && continue
                    echo "$line" | jq empty 2>/dev/null || debug "malformed JSONL line skipped"
                done < "$TMP_C"
            fi
        fi
    fi

    mkdir -p "$(dirname "$STATE_FILE")"
    TMP_STATE=$(mktemp "${STATE_FILE}.XXXXXX")
    jq -nc --argjson offset "$OFFSET" --argjson input "$INPUT" \
        --argjson cc "$CACHE_CREATE" --argjson cr "$CACHE_READ" --argjson out "$OUTPUT" \
        '{offset:$offset, input:$input, cache_create:$cc, cache_read:$cr, output:$out}' \
        > "$TMP_STATE" && mv "$TMP_STATE" "$STATE_FILE"
else
    read -r INPUT CACHE_CREATE CACHE_READ OUTPUT <<<"$(sum_usage "$TRANSCRIPT")"
fi

COST=$(awk "BEGIN {
    cost = ($INPUT / 1000000 * $INPUT_RATE) + \
           ($CACHE_CREATE / 1000000 * $CACHE_CREATE_RATE) + \
           ($CACHE_READ / 1000000 * $CACHE_READ_RATE) + \
           ($OUTPUT / 1000000 * $OUTPUT_RATE);
    printf \"%.4f\", cost
}")

TOTAL_TOKENS=$((INPUT + CACHE_CREATE + CACHE_READ + OUTPUT))

jq -nc --argjson tokens "$TOTAL_TOKENS" --arg cost "$COST" \
    --argjson input "$INPUT" --argjson output "$OUTPUT" \
    --argjson cache_read "$CACHE_READ" --argjson cache_create "$CACHE_CREATE" \
    '{tokens:$tokens, cost_usd:($cost|tonumber), input:$input, output:$output, cache_read:$cache_read, cache_create:$cache_create}'
