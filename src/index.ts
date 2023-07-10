import { initializeKeypair } from "./initializeKeypair"
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js"
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  NftWithToken,
} from "@metaplex-foundation/js"
import * as fs from "fs"

interface NftData {
  name: string
  symbol: string
  description: string
  sellerFeeBasisPoints: number
  imageFile: string
}

// example data for a new NFT
const nftData = {
  name: "Name",
  symbol: "SYMBOL",
  description: "Description",
  sellerFeeBasisPoints: 0,
  imageFile: "solana.png",
}

// example data for updating an existing NFT
const updateNftData = {
  name: "Update",
  symbol: "UPDATE",
  description: "Update Description",
  sellerFeeBasisPoints: 100,
  imageFile: "success.png",
}

async function uploadMetadata(
  metaplex: Metaplex,
  nftData: NftData,
): Promise<string> {
  const buffer = fs.readFileSync("src/" + nftData.imageFile);
  const file = toMetaplexFile(buffer, nftData.imageFile)
  const imageUri = await metaplex.storage().upload(file)

  const { uri } = await metaplex.nfts().uploadMetadata({
    name: nftData.name,
    symbol: nftData.symbol,
    description: nftData.description,
    image: imageUri
  })
  console.log(`metadata uri: ${uri}`)
  return uri
}

async function createNft(
  metaplex: Metaplex,
  uri: string,
  nftData: NftData,
): Promise<NftWithToken> {
  const { nft } = await metaplex.nfts().create(
    {
      uri: uri,
      name: nftData.name,
      sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
      symbol: nftData.symbol,
    },
    { commitment: 'finalized' }
  )
  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
  )
  return nft
}

async function updateNftUri(
  metaplex: Metaplex,
  uri: string,
  mintAddress: PublicKey,
) {
  const nft = await metaplex.nfts().findByMint({ mintAddress })
  const { response } = await metaplex.nfts().update(
    {
      nftOrSft: nft,
      uri: uri,
    },
    { commitment: "finalized" }
  )
  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
  );

  console.log(
      `Transaction: https://explorer.solana.com/tx/${response.signature}?cluster=devnet`,
  );
}

async function main() {
  // create a new connection to the cluster's API
  const connection = new Connection(clusterApiUrl("devnet"))

  // initialize a keypair for the user
  const user = await initializeKeypair(connection)

  console.log("PublicKey:", user.publicKey.toBase58())

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    )
  const uri = await uploadMetadata(metaplex, nftData)
  const nft = await createNft(metaplex, uri, nftData)

  const updatedUri = await uploadMetadata(metaplex, updateNftData)
  await updateNftUri(metaplex, updatedUri, nft.address)
}

main()
  .then(() => {
    console.log("Finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
