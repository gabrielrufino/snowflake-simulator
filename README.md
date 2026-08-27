# Snowflake Simulator

Snowflake Simulator is an interactive web-based tool designed to visualize, generate, and deconstruct Snowflake IDs (like those popularized by Twitter and used by Discord). It allows users to explore how these distributed, time-sortable unique identifiers are constructed using customizable bit layouts.

## Features

- **Dynamic Bit Layouts:** Configure your own custom timestamp, worker, and sequence bit distribution (up to a 64-bit total).
- **Multiple Worker Segments:** Supports arbitrary splitting of the worker bits (e.g. into Datacenter ID and Machine ID like Twitter's implementation).
- **Interactive Inspection:** Analyze existing Snowflake IDs to extract the timestamp, worker IDs, and sequence number.
- **Epoch Management:** Seamlessly swap between popular epochs (Twitter, Discord, Unix) or input your own custom date.
- **URL State Sharing:** All configuration options and the generated ID are synced to the URL, making it easy to share setups with others.
- **Modern ES Modules:** Built with standard ES modules natively in the browser.

## Getting Started

First, ensure you have Node.js installed, then install dependencies:

```bash
npm install
```

Start the local server:

```bash
npm start
```

## Testing

The project uses [Vitest](https://vitest.dev/) for unit testing core logic and utils.

```bash
npm test
```

## License

This project is licensed under the UNLICENSED license by Gabriel Rufino.