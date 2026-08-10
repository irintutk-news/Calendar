function first(...values){
  return values.find(value=>typeof value==='string'&&value.trim())?.trim()||''
}

function firstPublishableKey(raw){
  try{
    const parsed=JSON.parse(raw||'{}')
    if(typeof parsed==='string')return parsed
    if(Array.isArray(parsed))return first(...parsed)
    return first(parsed.default,...Object.values(parsed))
  }catch{
    return ''
  }
}

export default function handler(req,res){
  const url=first(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.PUBLIC_SUPABASE_URL
  )
  const key=first(
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    firstPublishableKey(process.env.SUPABASE_PUBLISHABLE_KEYS),
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.PUBLIC_SUPABASE_ANON_KEY
  )

  res.setHeader('Cache-Control','no-store')
  res.status(200).json({url,key,configured:Boolean(url&&key)})
}
