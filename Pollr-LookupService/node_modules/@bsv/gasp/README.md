# GASP - Graph Aware Sync Protocol

GASP (Graph Aware Sync Protocol) is a protocol designed to synchronize transaction data between two parties in a blockchain environment. It ensures the legitimacy and completeness of transaction data using a recursive reconciliation method.

## Features

- Synchronizes transaction data between two parties.
- Ensures legitimacy and completeness of transaction data.
- Recursive reconciliation method.
- Adaptable to various blockchain environments.
- Emphasizes security, efficiency, and data integrity.

## Installation

To install the GASP library, run:

```bash
npm i @bsv/gasp
```

## Usage

### Example Usage

For now, check out the [GASP test suite](./src/__tests/GASP.test.ts) to see how GASP works.

**The below code is for reference only, and will probably not work (it is untested). Check back later for links to examples where GASP is implemented.**

Here's a basic example demonstrating how to use the GASP library:

```typescript
import { GASP, GASPStorage, GASPRemote, GASPInitialRequest, GASPNode } from '@bsv/gasp';

// Mock implementation of the storage interface for demonstration purposes
class ExampleGASPStorage implements GASPStorage {
  private utxos: Array<{ txid: string; outputIndex: number; rawTx: string; timestamp?: number }> = [];

  constructor(utxos: Array<{ txid: string; outputIndex: number; rawTx: string; timestamp?: number }>) {
    this.utxos = utxos;
  }

  async findKnownUTXOs(since: number): Promise<Array<{ txid: string; outputIndex: number }>> {
    return this.utxos
      .filter(utxo => utxo.timestamp && utxo.timestamp > since)
      .map(utxo => ({ txid: utxo.txid, outputIndex: utxo.outputIndex }));
  }

  async hydrateGASPNode(graphID: string, txid: string, outputIndex: number, metadata: boolean): Promise<GASPNode> {
    const found = this.utxos.find(utxo => utxo.txid === txid && utxo.outputIndex === outputIndex);
    if (!found) {
      throw new Error('UTXO not found');
    }
    return {
      graphID,
      rawTx: found.rawTx,
      outputIndex: found.outputIndex,
      // In a real implementation, you would return real proofs and metadata
      proof: metadata ? 'example_proof' : undefined,
      txMetadata: metadata ? 'example_tx_metadata' : undefined,
      outputMetadata: metadata ? 'example_output_metadata' : undefined,
    };
  }

  async findNeededInputs(tx: GASPNode): Promise<{ requestedInputs: Record<string, { metadata: boolean }> } | void> {
    // In a real scenario, this method would analyze the transaction inputs and determine if more information is needed
    return; // Assuming no additional inputs are needed for simplicity
  }

  async appendToGraph(tx: GASPNode, spentBy?: string): Promise<void> {
    console.log(`Appending transaction to graph: ${tx.txid} at output index ${tx.outputIndex}`);
  }

  async validateGraphAnchor(graphID: string): Promise<void> {
    console.log(`Validating graph anchor for graph ID: ${graphID}`);
  }

  async discardGraph(graphID: string): Promise<void> {
    console.log(`Discarding graph with ID: ${graphID}`);
  }

  async finalizeGraph(graphID: string): Promise<void> {
    console.log(`Finalizing graph with ID: ${graphID}`);
  }
}

// Example implementation of the remote interface
class ExampleGASPRemote implements GASPRemote {
  private remoteStorage: ExampleGASPStorage;

  constructor(remoteStorage: ExampleGASPStorage) {
    this.remoteStorage = remoteStorage;
  }

  async getInitialResponse(request: GASPInitialRequest): Promise<{ UTXOList: Array<{ txid: string; outputIndex: number }> }> {
    return { UTXOList: await this.remoteStorage.findKnownUTXOs(request.since) };
  }

  async requestNode(graphID: string, txid: string, outputIndex: number, metadata: boolean): Promise<GASPNode> {
    return this.remoteStorage.hydrateGASPNode(graphID, txid, outputIndex, metadata);
  }
}

// Initializing storages and remotes for two participants: Alice and Bob
const aliceStorage = new ExampleGASPStorage([
  { txid: 'tx1', outputIndex: 0, rawTx: '010000...', timestamp: 162005 },
  { txid: 'tx2', outputIndex: 1, rawTx: '020000...', timestamp: 162010 }
]);

const bobStorage = new ExampleGASPStorage([]);

const bobRemote = new ExampleGASPRemote(aliceStorage);
const alice = new GASP(aliceStorage, bobRemote);

// Simulate synchronization process
(async () => {
  try {
    await alice.sync();
    console.log('Synchronization between Alice and Bob completed successfully.');
  } catch (error) {
    console.error('Failed to synchronize:', error);
  }
})()
```

## License

The license for the code in this repository is the Open BSV License.