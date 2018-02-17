export interface Position {
	row: number;
	column: number;
}

export interface TextUdpate {
	oldStart: Position;
	oldEnd: Position;
	newStart: Position;
	newEnd: Position;
	oldText: string;
	newText: string;
}

export interface Selection {
	exclusive?: boolean;
	range: {
		start: Position;
		end: Position;
	};
	reversed: boolean;
	tailed?: boolean;
}

export interface SelectionMap {
	[markerId : number]: Selection;
}
