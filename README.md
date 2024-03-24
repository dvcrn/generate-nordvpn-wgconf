# NordVPN WireGuard Configuration Generator

This (macOS) tool automates the generation of WireGuard configuration files for NordVPN servers. It allows users to generate configurations for specific countries or all available countries, leveraging NordVPN's recommended servers.

This tool automates extracting of the NordVPN WireGuard privatekey from keychain (macOS). Please make sure you read **Usage** below.

## Getting Started

### Installation

```
npx generate-nordvpn-wgconf
```

### Usage

Generate configurations using the command-line interface. The tool supports several options for customization:

You have to either specify your **NordVPN WireGuard privatekey** (if you know it already), or specify your **NordVPN AccountID**, get it from https://my.nordaccount.com/dashboard/nordvpn/manual-configuration/

- If `--pk` is specified, it will just use that and no macOS specific functionality is used
- If `--nordvpn-accountid` is specified, it will do a keychain lookup to find your NordVPN credentials, to extract the privatekey.

#### How to automatically extract privatekey on macOS?

**Read carefully, otherwise it won't work.**

1. Install NordVPN **from the Mac AppStore**, not directly from the website or brew
2. Go into settings and change protocol to NordLynx
3. Connect to any server with NordLynx, doesn't matter which

After doing that, NordVPN will store the NordLynx (WireGuard) credentials in keychain, for us to extract.

#### Options

- `--country`, `-c`: Specify the country code(s) (ISO 3166-1 alpha-2 code) for which to generate the configuration. For example, `US` for the United States. `DE,JP` for Germany and Japan.
- `--wireguard-privatekey`, `-pk`: Your WireGuard private key. This is required unless using `--nordvpn-accountid`.
- `--nordvpn-accountid`, `-id`: Your NordVPN account ID. Required if you do not provide a WireGuard private key.
- `--dns-server`, `-dns`: Specify the DNS server to use in the configuration. Defaults to `103.86.96.100`.
- `--amount`, `-a`: The number of configurations to generate for the specified country. Defaults to `1`.
- `--all-countries`: Generate configurations for all available countries.
- `--outdir`, `-o`: The output directory for the generated configuration files. Defaults to the current working directory.

#### Generating a Single Configuration

To generate a configuration for a specific country with your WireGuard private key:

```bash
node index.js --country US --wireguard-privatekey YOUR_PRIVATE_KEY --outdir /path/to/output/dir
```

#### Generating Multiple Configurations

To generate multiple configurations for a specific country:

```bash
node index.js --country US --wireguard-privatekey YOUR_PRIVATE_KEY --amount 5 --outdir /path/to/output/dir
```

#### Generating Configurations for All Countries

To generate configurations for all available countries:

```bash
node index.js --all-countries --wireguard-privatekey YOUR_PRIVATE_KEY --outdir /path/to/output/dir
```

#### Generating Configurations for 2 Countries

To generate configurations for all available countries:

```bash
node index.js --country JP,DE --wireguard-privatekey YOUR_PRIVATE_KEY --outdir /path/to/output/dir
```

### Contributing

Contributions are welcome. Please open an issue or submit a pull request with your improvements.

### License

MIT
