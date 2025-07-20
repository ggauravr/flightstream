# Core Flight Package Architecture

This document provides comprehensive Mermaid diagrams showing the class structure, methods, and dependencies of the FlightStream packages.

## Package Structure

```
@flightstream/
├── core-server/          # Core Flight server framework
├── core-client/          # Core Flight client framework  
├── core-shared/          # Shared utilities and protocol helpers
├── adapters-csv/         # CSV file adapter
└── utils-arrow/          # Advanced Arrow utilities
```

## Class Hierarchy Diagram

```mermaid
classDiagram
    class FlightServer {
        -options: Object
        -server: grpc.Server
        -flightService: FlightServiceBase
        -protocolHandlers: Object
        -logger: Console
        +constructor(options)
        +setFlightService(flightService)
        +start() Promise~number~
        +stop() Promise~void~
        +getServerInfo() Object
        +isRunning() boolean
        -_initializeGrpcServer()
        -_registerGrpcService()
    }

    class FlightClient {
        -options: Object
        -client: grpc.Client
        -connectionManager: ConnectionManager
        -retryHandler: RetryHandler
        -logger: Console
        +constructor(options)
        +connect() Promise~void~
        +disconnect() Promise~void~
        +listDatasets() Promise~Array~
        +getDataset(datasetId) Promise~Arrow.Table~
        +streamDataset(datasetId) AsyncIterator
        +getSchema(datasetId) Promise~Arrow.Schema~
        -_setupEventListeners()
    }

    class FlightServiceBase {
        -options: Object
        -datasets: Map
        -logger: Console
        +constructor(options)
        +listFlights(call)
        +getFlightInfo(call)
        +getSchema(call)
        +doGet(call)
        +listActions(call)
        +doAction(call)
        +getDatasets() Array
        +hasDataset(datasetId) boolean
        +refreshDatasets() Promise
        #_initialize() Promise
        #_initializeDatasets() Promise
        #_inferSchemaForDataset(datasetId) Promise
        #_streamDataset(call, dataset) Promise
        #_createFlightInfo(datasetId, dataset) Promise
        #_extractDatasetId(descriptor) string
    }

    class CSVFlightService {
        -csvOptions: Object
        +constructor(options)
        +initialize() Promise
        +getCSVStats() Object
        #_initialize() Promise
        #_initializeDatasets() Promise
        #_inferSchemaForDataset(filePath) Promise
        #_streamDataset(call, dataset) Promise
    }

    class ArrowBuilder {
        +constructor()
        +fromCSV(filePath, options) Promise~Arrow.Table~
        +createRecordBatch(data) Arrow.RecordBatch
        +createTable(recordBatches) Arrow.Table
    }

    class createProtocolHandlers {
        +createProtocolHandlers(flightService) Object
        +handshake(call)
        +listFlights(call)
        +getFlightInfo(call, callback)
        +getSchema(call, callback)
        +doGet(call)
        +doPut(call)
        +doAction(call)
        +listActions(call)
    }

    FlightServer --> FlightServiceBase : uses
    FlightServer --> createProtocolHandlers : creates
    CSVFlightService --|> FlightServiceBase : extends
    createProtocolHandlers --> FlightServiceBase : delegates to
    FlightClient --> ConnectionManager : uses
    FlightClient --> RetryHandler : uses
```

## Method Flow Diagram

```mermaid
flowchart TD
    A[Client Request] --> B[gRPC Server]
    B --> C[Protocol Handlers]
    
    C --> D{Request Type}
    
    D -->|Handshake| E[handshake handler]
    D -->|ListFlights| F[listFlights handler]
    D -->|GetFlightInfo| G[getFlightInfo handler]
    D -->|GetSchema| H[getSchema handler]
    D -->|DoGet| I[doGet handler]
    D -->|DoPut| J[doPut handler]
    D -->|DoAction| K[doAction handler]
    D -->|ListActions| L[listActions handler]
    
    E --> M[FlightService.handshake]
    F --> N[FlightService.listFlights]
    G --> O[FlightService.getFlightInfo]
    H --> P[FlightService.getSchema]
    I --> Q[FlightService.doGet]
    J --> R[FlightService.doPut]
    K --> S[FlightService.doAction]
    L --> T[FlightService.listActions]
    
    N --> U[Stream FlightInfo objects]
    O --> V[Return FlightInfo]
    P --> W[Return SchemaResult]
    Q --> X[Stream FlightData]
    R --> Y[Process uploaded data]
    S --> Z[Execute custom actions]
    T --> AA[Stream ActionType objects]
    
    U --> BB[Client Response]
    V --> BB
    W --> BB
    X --> BB
    Y --> BB
    Z --> BB
    AA --> BB
```

## Package Dependencies

```mermaid
graph TD
    A[@flightstream/core-server] --> B[@grpc/grpc-js]
    A --> C[@grpc/proto-loader]
    A --> D[apache-arrow]
    A --> E[@flightstream/core-shared]
    
    F[@flightstream/core-client] --> B
    F --> C
    F --> D
    F --> E
    
    G[@flightstream/core-shared] --> B
    G --> C
    
    H[@flightstream/adapters-csv] --> A
    H --> I[fast-csv]
    H --> J[@flightstream/utils-arrow]
    
    K[@flightstream/utils-arrow] --> D
    K --> L[pino]
    
    M[examples/basic-server] --> A
    M --> H
    
    N[examples/basic-client] --> F
    
    subgraph "External Dependencies"
        B
        C
        D
        I
        L
    end
    
    subgraph "FlightStream Packages"
        A
        E
        F
        H
        J
    end
    
    subgraph "Applications"
        M
        N
    end
```

## Server Lifecycle Diagram

```mermaid
sequenceDiagram
    participant Client
    participant FlightServer
    participant ProtocolHandlers
    participant FlightService
    participant gRPCServer

    Note over FlightServer: Server Initialization
    FlightServer->>FlightServer: constructor(options)
    FlightServer->>FlightServer: _initializeGrpcServer()
    FlightServer->>gRPCServer: new grpc.Server()
    FlightServer->>ProtocolHandlers: createProtocolHandlers(flightService)
    FlightServer->>gRPCServer: addService(FlightService.service, handlers)

    Note over FlightServer: Service Registration
    FlightServer->>FlightServer: setFlightService(flightService)
    FlightServer->>ProtocolHandlers: createProtocolHandlers(flightService)
    FlightServer->>gRPCServer: _registerGrpcService()

    Note over FlightServer: Server Start
    FlightServer->>FlightServer: start()
    FlightServer->>gRPCServer: bindAsync(address, credentials)
    gRPCServer-->>FlightServer: port number
    FlightServer->>gRPCServer: start()
    FlightServer-->>Client: Server ready on port

    Note over Client, FlightService: Request Handling
    Client->>FlightServer: gRPC request
    FlightServer->>ProtocolHandlers: delegate to appropriate handler
    ProtocolHandlers->>FlightService: call service method
    FlightService-->>ProtocolHandlers: response data
    ProtocolHandlers-->>FlightServer: gRPC response
    FlightServer-->>Client: response

    Note over FlightServer: Server Shutdown
    FlightServer->>FlightServer: stop()
    FlightServer->>gRPCServer: tryShutdown()
    gRPCServer-->>FlightServer: shutdown complete
    FlightServer-->>Client: Server stopped
```

## Client Lifecycle Diagram

```mermaid
sequenceDiagram
    participant Application
    participant FlightClient
    participant ConnectionManager
    participant RetryHandler
    participant FlightServer

    Note over FlightClient: Client Initialization
    FlightClient->>FlightClient: constructor(options)
    FlightClient->>ConnectionManager: new ConnectionManager()
    FlightClient->>RetryHandler: new RetryHandler()
    FlightClient->>FlightClient: _setupEventListeners()

    Note over FlightClient: Connection
    Application->>FlightClient: connect()
    FlightClient->>ConnectionManager: establishConnection()
    ConnectionManager->>FlightServer: gRPC connection
    FlightServer-->>ConnectionManager: connection established
    ConnectionManager-->>FlightClient: connection ready
    FlightClient-->>Application: connected

    Note over Application, FlightServer: Data Operations
    Application->>FlightClient: listDatasets()
    FlightClient->>FlightServer: listFlights request
    FlightServer-->>FlightClient: datasets list
    FlightClient-->>Application: datasets

    Application->>FlightClient: getDataset(datasetId)
    FlightClient->>RetryHandler: executeWithRetry()
    RetryHandler->>FlightServer: doGet request
    FlightServer-->>RetryHandler: Arrow data
    RetryHandler-->>FlightClient: dataset
    FlightClient-->>Application: Arrow table

    Note over FlightClient: Disconnection
    Application->>FlightClient: disconnect()
    FlightClient->>ConnectionManager: closeConnection()
    ConnectionManager->>FlightServer: close connection
    FlightServer-->>ConnectionManager: connection closed
    ConnectionManager-->>FlightClient: disconnected
    FlightClient-->>Application: disconnected
```

## Data Flow Architecture

```mermaid
flowchart TD
    A[CSV Files] --> B[CSVFlightService]
    B --> C[Schema Inference]
    C --> D[Arrow Schema]
    B --> E[CSV Parser]
    E --> F[Arrow Builder]
    F --> G[Arrow Record Batches]
    G --> H[Flight Protocol]
    H --> I[gRPC Stream]
    I --> J[Client]
    
    K[FlightClient] --> L[Connection Manager]
    L --> M[Retry Handler]
    M --> N[gRPC Client]
    N --> O[Flight Protocol]
    O --> P[Arrow Data]
    P --> Q[Application]
    
    subgraph "Server Side"
        A
        B
        C
        D
        E
        F
        G
        H
        I
    end
    
    subgraph "Client Side"
        K
        L
        M
        N
        O
        P
        Q
    end
```

## Error Handling Architecture

```mermaid
flowchart TD
    A[Request] --> B{Valid Request?}
    B -->|No| C[Invalid Argument Error]
    B -->|Yes| D[Process Request]
    
    D --> E{Service Available?}
    E -->|No| F[Service Unavailable Error]
    E -->|Yes| G[Execute Operation]
    
    G --> H{Operation Success?}
    H -->|No| I[Operation Error]
    H -->|Yes| J[Return Response]
    
    C --> K[Error Response]
    F --> K
    I --> K
    
    J --> L[Success Response]
    
    subgraph "Error Types"
        C
        F
        I
    end
    
    subgraph "Responses"
        K
        L
    end
```

## Performance Optimization

### Memory Management

```mermaid
flowchart TD
    A[Large CSV File] --> B[Streaming Parser]
    B --> C[Batch Processing]
    C --> D[Arrow Record Batches]
    D --> E[Memory Pool]
    E --> F[gRPC Stream]
    F --> G[Client Processing]
    G --> H[Memory Cleanup]
    
    I[Batch Size Config] --> C
    J[Memory Limits] --> E
    K[GC Triggers] --> H
```

### Connection Pooling

```mermaid
flowchart TD
    A[Client Request] --> B[Connection Pool]
    B --> C{Available Connection?}
    C -->|Yes| D[Reuse Connection]
    C -->|No| E[Create New Connection]
    E --> F[Add to Pool]
    D --> G[Execute Request]
    F --> G
    G --> H[Return Connection to Pool]
```

## Security Architecture

```mermaid
flowchart TD
    A[Client Request] --> B[Authentication Layer]
    B --> C{Authenticated?}
    C -->|No| D[Authentication Error]
    C -->|Yes| E[Authorization Layer]
    
    E --> F{Authorized?}
    F -->|No| G[Authorization Error]
    F -->|Yes| H[Request Processing]
    
    H --> I[Data Access]
    I --> J[Response]
    
    D --> K[Error Response]
    G --> K
    J --> L[Success Response]
```

## Monitoring and Observability

```mermaid
flowchart TD
    A[Request] --> B[Request Logger]
    B --> C[Performance Monitor]
    C --> D[Metrics Collector]
    D --> E[Alerting System]
    
    F[Server Events] --> G[Event Logger]
    G --> H[Health Check]
    H --> I[Status Dashboard]
    
    J[Error Events] --> K[Error Logger]
    K --> L[Error Tracking]
    L --> M[Notification System]
    
    subgraph "Monitoring"
        B
        C
        D
        E
    end
    
    subgraph "Observability"
        G
        H
        I
        K
        L
        M
    end
```

This architecture provides a robust, scalable foundation for Apache Arrow Flight streaming services with comprehensive error handling, performance optimization, and monitoring capabilities. 