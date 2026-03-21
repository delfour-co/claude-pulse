#!/bin/bash
# Compute session cost from transcript JSONL
# Usage: compute-cost.sh <transcript_path> <model>
# Outputs: JSON with token counts and cost in USD

set -euo pipefail

TRANSCRIPT="$1"
MODEL="${2:-unknown}"

if [ ! -f "$TRANSCRIPT" ]; then
    echo '{"tokens":0,"cost_usd":0}'
    exit 0
fi

# Sum all usage fields from assistant messages
TOTALS=$(grep -o '"usage":{[^}]*"output_tokens":[0-9]*' "$TRANSCRIPT" 2>/dev/null | \
    sed 's/.*"input_tokens":\([0-9]*\).*"cache_creation_input_tokens":\([0-9]*\).*"cache_read_input_tokens":\([0-9]*\).*"output_tokens":\([0-9]*\).*/\1 \2 \3 \4/' | \
    awk '{input+=$1; cache_create+=$2; cache_read+=$3; output+=$4} END {printf "%d %d %d %d", input, cache_create, cache_read, output}')

INPUT=$(echo "$TOTALS" | awk '{print $1}')
CACHE_CREATE=$(echo "$TOTALS" | awk '{print $2}')
CACHE_READ=$(echo "$TOTALS" | awk '{print $3}')
OUTPUT=$(echo "$TOTALS" | awk '{print $4}')

# Pricing per million tokens (USD)
case "$MODEL" in
    *opus*)
        INPUT_RATE="5.00"; OUTPUT_RATE="25.00"; CACHE_READ_RATE="0.50"; CACHE_CREATE_RATE="6.25" ;;
    *haiku*)
        INPUT_RATE="1.00"; OUTPUT_RATE="5.00"; CACHE_READ_RATE="0.10"; CACHE_CREATE_RATE="1.25" ;;
    *) # sonnet and others
        INPUT_RATE="3.00"; OUTPUT_RATE="15.00"; CACHE_READ_RATE="0.30"; CACHE_CREATE_RATE="3.75" ;;
esac

# Calculate cost: tokens / 1_000_000 * rate
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
