import mongoose, {Schema} from "mongoose"


const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.type.ObjectId,// one who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.type.ObjectId,// one to  whom  subscriber is subscribing
        ref: "User"
    }     
},{ timestamps: true})

export const subscription = mongoose.model
("Subscription", subscriptionSchema)